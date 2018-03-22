'use strict';

const path = require('path');
const fse = require('fs-extra');

const config = require('../libs/config.js');
const logsPool = require('../libs/logs-pool.js');
const RawArgument = require('../libs/raw-argument.js');

const chains = require('../libs/layers/chains.js');
const handlers = require('../handlers');

async function create(manifest, context = null) {

    let log = logsPool.get(manifest.name);
    let chain = chains.create({
        name: manifest.name,
        layer: manifest.from,
        location: config.imagesLocation,
    });

    {
        let name = `${manifest.workdir} ${manifest.from}`;
        await chain.layer(name, async layer => {

            let dir = path.resolve(manifest.workdir);
            dir = path.join(layer.path, dir);
            await fse.ensureDir(dir);

        });
    }

    for (let obj of manifest.building) {

        let command = Object.keys(obj)[0];
        let args = obj[command];

        let handler = handlers[command];
        await handler.do({
            manifest,
            context,
            args,
            stage: 'building',
        });

    }

    await chain.layer(new RawArgument(manifest.name), async storage => {

        manifest.toFile(path.join(storage.path, '.manifest'));

    }, false);

    chains.delete(manifest.name);

}

module.exports = create;
