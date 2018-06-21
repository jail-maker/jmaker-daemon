'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const uuid4 = require('uuid/v4');

const config = require('../libs/config');
const logsPool = require('../libs/logs-pool');
const RawArgument = require('../libs/raw-argument');

const ContainerDataset = require('../libs/layers/container-dataset');
const Dataset = require('../libs/layers/dataset');

const handlers = require('../handlers');
const RuntimeScope = require('../libs/runtime-scope');
const datasets = require('../libs/datasets-db');

const CommandInvoker = require('../libs/command-invoker');

const mountDevfs = require('../libs/mount-devfs');
const mountFdescfs = require('../libs/mount-fdescfs');
const mountProcfs = require('../libs/mount-procfs');
const umount = require('../libs/umount');

async function create(manifest, context = null) {

    let clonedManifest = manifest.clone();
    let scope = new RuntimeScope;
    let invoker = new CommandInvoker;
    let parent = await datasets.findOne({ name: manifest.from });
    let containerId = uuid4();
    let parentId = parent ? parent.id : null;
    let imagesDataset = Dataset.createIfNotExists(config.imagesLocation);

    let containerPath = path.join(config.containersLocation, containerId);
    let containerDataset = null;

    if (parentId) {

        let parentPath = path.join(config.containersLocation, parentId);
        let parentDataset = ContainerDataset.getDataset(parentPath);
        containerDataset = parentDataset.fork(containerPath);

    } else {

        containerDataset = ContainerDataset.create();

    }


    let log = logsPool.create(containerId);

    scope.on('close', _ => logsPool.delete(containerId));

    await datasets.insert({
        id: containerId,
        name: containerId,
        parentId,
        imageName: null,
    });

    {

        let dev = path.join(containerDataset.path, '/dev');
        let fd = path.join(containerDataset.path, '/dev/fd');
        let proc = path.join(containerDataset.path, '/proc');

        await fse.ensureDir(dev);
        await fse.ensureDir(fd);
        await fse.ensureDir(proc);

        scope.on('destroy', _ => {

            umount(dev, true);
            umount(fd, true);
            umount(proc, true);

        });

        mountDevfs(dev);
        mountFdescfs(fd);
        mountProcfs(proc);

    }

    {
        let name = `${manifest.workdir} ${manifest.from}`;
        await containerDataset.commit(name, async _ => {

            let dir = path.resolve(manifest.workdir);
            dir = path.join(containerDataset.path, dir);
            console.log('ensure workdir:', dir);
            await fse.ensureDir(dir);

        });
    }

    for (let index in manifest.building) {

        let obj = manifest.building[index];
        let commandName = Object.keys(obj)[0];
        let args = obj[commandName];

        let commandPath = `../builder-commands/${commandName}-command`;
        let CommandClass = require(commandPath);
        let command = new CommandClass({
            index,
            dataset: containerDataset,
            manifest,
            containerId,
            context,
            scope,
            args,
        });

        await invoker.submit(command);

    }

    await containerDataset.commit('create manifest', async _ => {

        clonedManifest.toFile(path.join(containerDataset.path, '.manifest'));

    }, false);

    containerDataset.ensureSpecialSnapshot();

    {

        let imageName = `${uuid4()}.tar`;
        let file = path.join(imagesDataset.path, imageName);
        let stream = await containerDataset.compressStream();

        stream.pipe(fs.createWriteStream(file));
        await datasets.update({ id: containerId }, { $set: { imageName } });

    }

    scope.close();

    return containerId;

}

module.exports = create;
