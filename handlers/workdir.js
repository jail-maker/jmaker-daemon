'use strict';

const fse = require('fs-extra');
const path = require('path');
const logsPool = require('../libs/logs-pool');
const chains = require('../libs/layers/chains');
const Layers = require('../libs/layers/layers');
const config = require('../libs/config');

class Workdir {

    constructor() {

        this.name = 'workdir';

    }

    async do(data = {}) {

        let {
            layer,
            index,
            manifest,
            args = [],
        } = data;

        let log = logsPool.get(manifest.name);
        let workdir = path.resolve(manifest.workdir, args);
        let name = `${index} ${workdir} ${manifest.from}`;

        await layer.commit(name, async _ => {

            let dir = path.join(layer.path, workdir);
            console.log('workdir:', dir);
            await fse.ensureDir(dir);

        });

        manifest.workdir = workdir;

    }

}

module.exports = new Workdir;
