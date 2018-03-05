'use strict';

const { spawnSync } = require('child_process');
const { ensureDir } = require('fs-extra');
const path = require('path');
const config = require('../libs/config.js');
const logsPool = require('../libs/logs-pool.js');
const Layers = require('../libs/layers');
const chains = require('../libs/layers/chains.js');

class Mount {

    constructor() {

        this.name = 'mount';

    }

    async do(data = {}) {

        let { stage } = data;

        switch (stage) {

            case 'building':

                await this._doBuilding(data);
                break;

            case 'starting':

                await this._doStarting(data);
                break;

            default:
                throw new Error('Unknown stage.');
                break;

        }

    }

    async _doBuilding(data = {}) {

        let {
            manifest,
            args = [],
        } = data;

        let log = logsPool.get(manifest.name);
        let chain = chains.get(manifest.name);

        if (typeof(args) === 'string') 
            args = [args, args];

        let [src, dst] = args;

        src = path.resolve('/', src);
        dst = path.resolve(manifest.workdir, dst);

        chain.on('precall', layer => {

            ensureDir(dst);

            let result = spawnSync('mount_nullfs', [
                src, path.join(layer.path, dst),
            ]);

            if (result.status !== 0)
                throw new Error('Error execution mount_nullfs.');

        });

        chain.on('postcall', layer => {

            let result = spawnSync('umount', [
                '-f', path.join(layer.path, dst)
            ]);

        });

        chain.on('fail', layer => {

            let result = spawnSync('umount', [
                '-f', path.join(layer.path, dst)
            ]);

        });

    }

    async _doStarting(data = {}) {

        let {
            manifest,
            args = [],
            stage,
        } = data;

        let layers = new Layers(config.zfsPool);
        let layer = layers.get(manifest.name);
        let log = logsPool.get(manifest.name);

        if (typeof(args) === 'string') 
            args = [args, args];

        let [src, dst] = args;

        src = path.resolve('/', src);
        dst = path.join(layer.path, path.resolve(manifest.workdir, dst));

        ensureDir(dst);

        let result = spawnSync('mount_nullfs', [
            src, dst,
        ]);

        if (result.status !== 0)
            throw new Error('Error execution mount_nullfs.');

    }

}

module.exports = new Mount;
