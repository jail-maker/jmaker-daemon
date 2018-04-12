'use strict';

const fse = require('fs-extra');
const path = require('path');
const logsPool = require('../libs/logs-pool.js');
const chains = require('../libs/layers/chains.js');
const Layers = require('../libs/layers/layers.js');
const config = require('../libs/config.js');

class Workdir {

    constructor() {

        this.name = 'workdir';

    }

    async do(data = {}) {

        let {
            index,
            manifest,
            args = [],
        } = data;

        let layers = new Layers(config.imagesLocation);
        let layer = layers.get(manifest.name);
        let log = logsPool.get(manifest.name);
        let workdir = path.resolve(manifest.workdir, args);
        let name = `${index} ${workdir} ${manifest.from}`;

        await layer.commit(name, async _ => {

            let dir = path.join(layer.path, workdir);
            await fse.ensureDir(dir);

        });

        manifest.workdir = workdir;

    }

}

module.exports = new Workdir;
