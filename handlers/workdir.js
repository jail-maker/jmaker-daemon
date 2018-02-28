'use strict';

const fse = require('fs-extra');
const path = require('path');
const logsPool = require('../libs/logs-pool.js');
const chains = require('../libs/layers/chains.js');

class Workdir {

    constructor() {

        this.name = 'workdir';

    }

    async do(data = {}) {

        let {
            manifest,
            args = [],
        } = data;

        let log = logsPool.get(manifest.name);
        let chain = chains.get(manifest.name);
        let workdir = path.resolve(manifest.workdir, args);
        let name = `${workdir} ${manifest.from}`;

        await chain.layer(name, async layer => {

            let dir = path.join(layer.path, workdir);
            await fse.ensureDir(dir);

        });

        manifest.workdir = workdir;

    }

}

module.exports = new Workdir;
