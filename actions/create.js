'use strict';

const path = require('path');
const fse = require('fs-extra');
const uuid4 = require('uuid/v4');

const config = require('../libs/config');
const logsPool = require('../libs/logs-pool');
const RawArgument = require('../libs/raw-argument');

const chains = require('../libs/layers/chains');
const handlers = require('../handlers');
const RuntimeScope = require('../libs/runtime-scope');
const datasets = require('../libs/datasets-db');

const Layers = require('../libs/layers/layers');
const CommandInvoker = require('../libs/command-invoker');

const mountDevfs = require('../libs/mount-devfs');
const mountFdescfs = require('../libs/mount-fdescfs');
const mountProcfs = require('../libs/mount-procfs');
const umount = require('../libs/umount');

async function create(manifest, context = null) {

    let clonedManifest = manifest.clone();
    let scope = new RuntimeScope;
    let invoker = new CommandInvoker;
    let dataset = await datasets.findOne({ name: manifest.name });
    let parent = await datasets.findOne({ name: manifest.from });
    let containerId = dataset ? dataset.id : uuid4();
    let parentId = parent ? parent.id : null;
    let layers = new Layers(config.imagesLocation);
    let layer = layers.createIfNotExists(containerId, parentId);
    let log = logsPool.create(containerId);

    scope.on('close', _ => logsPool.delete(containerId));

    if (!dataset) {

        await datasets.insert({ id: containerId, name: manifest.name });

    }

    {

        let dev = path.join(layer.path, '/dev');
        let fd = path.join(layer.path, '/dev/fd');
        let proc = path.join(layer.path, '/proc');

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
        await layer.commit(name, async _ => {

            let dir = path.resolve(manifest.workdir);
            dir = path.join(layer.path, dir);
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
            layer,
            manifest,
            containerId,
            context,
            scope,
            args,
        });

        await invoker.submit(command);

    }

    await layer.commit('create manifest', async _ => {

        clonedManifest.toFile(path.join(layer.path, '.manifest'));

    }, false);

    layer.snapshot('last');
    scope.close();

    return;

}

module.exports = create;
