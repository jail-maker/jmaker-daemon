'use strict';

const path = require('path');
const fse = require('fs-extra');

const config = require('../libs/config');
const logsPool = require('../libs/logs-pool');
const RawArgument = require('../libs/raw-argument');

const chains = require('../libs/layers/chains');
const handlers = require('../handlers');
const RuntimeScope = require('../libs/runtime-scope');

const Layers = require('../libs/layers/layers');

async function create(manifest, context = null) {

    let scope = new RuntimeScope;
    let log = logsPool.get(manifest.name);

    let layers = new Layers(config.imagesLocation);
    let layer = layers.createIfNotExists(manifest.name, manifest.from);

    {
        let name = `${manifest.workdir} ${manifest.from}`;
        await layer.commit(name, async _ => {

            let dir = path.resolve(manifest.workdir);
            dir = path.join(layer.path, dir);
            await fse.ensureDir(dir);

        });
    }

    for (let index in manifest.building) {

        let obj = manifest.building[index];
        let command = Object.keys(obj)[0];
        let args = obj[command];

        let handler = handlers[command];
        await handler.do({
            index,
            manifest,
            context,
            scope,
            args,
            stage: 'building',
        });

    }

    await layer.commit('create manifest', async _ => {

        manifest.toFile(path.join(layer.path, '.manifest'));

    }, false);

    layer.snapshot('last');
    scope.close();

    return;

    // ===================================================


    // let chain = chains.create({
    //     name: manifest.name,
    //     head: manifest.from,
    //     location: config.imagesLocation,
    // });

    // {
    //     let name = `${manifest.workdir} ${manifest.from}`;
    //     await chain.layer(name, async layer => {

    //         let dir = path.resolve(manifest.workdir);
    //         dir = path.join(layer.path, dir);
    //         await fse.ensureDir(dir);

    //     });
    // }

    // for (let obj of manifest.building) {

    //     let command = Object.keys(obj)[0];
    //     let args = obj[command];

    //     let handler = handlers[command];
    //     await handler.do({
    //         manifest,
    //         context,
    //         scope,
    //         args,
    //         stage: 'building',
    //     });

    // }

    // await chain.layer(new RawArgument(manifest.name), async storage => {

    //     manifest.toFile(path.join(storage.path, '.manifest'));

    // }, false);

    // chain.squash();
    // chains.delete(manifest.name);
    // scope.close();

}

module.exports = create;
