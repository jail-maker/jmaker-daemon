'use strict';

const { spawnSync } = require('child_process');
const { ensureDir } = require('fs-extra');
const path = require('path');
const sha256 = require('js-sha256').sha256;
const config = require('../libs/config.js');
const logsPool = require('../libs/logs-pool.js');
const Layers = require('../libs/layers');
const chains = require('../libs/layers/chains.js');

class Mount {

    constructor() {

        this.name = 'volume';

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

    _normalizeArgs(args = {}) {

        const template = {
            name: undefined,
            path: undefined,
        };

        if (typeof(args) === 'string') 
            args = { path: args };

        return Object.assign(template, args);

    }

    async _doBuilding(data = {}) {

        let {
            manifest,
            args = {},
        } = data;

        let log = logsPool.get(manifest.name);
        let chain = chains.get(manifest.name);
        let volumes = new Layers(config.volumesLocation);

        args = this._normalizeArgs(args);

        if (args.path === undefined)
            throw new Error('volume path is undefined.');

        if (args.name === undefined)
            args.name = sha256(`${manifest.name} ${args.path}`).slice(0, 12);

        let dst = args.path;
        dst = path.resolve(manifest.workdir, dst);

        let volume = volumes.has(args.name)
            ? volumes.get(args.name)
            : volumes.create(args.name);

        let src = volume.path;

        chain.on('precall', layer => {

            let absoluteDst = path.join(layer.path, dst);
            ensureDir(absoluteDst);

            let result = spawnSync('mount_nullfs', [ src, absoluteDst ]);

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
            args = {},
        } = data;

        let layers = new Layers(config.imagesLocation);
        let volumes = new Layers(config.volumesLocation);
        let layer = layers.get(manifest.name);
        let log = logsPool.get(manifest.name);

        args = this._normalizeArgs(args);

        if (args.path === undefined)
            throw new Error('volume path is undefined.');

        if (args.name === undefined)
            args.name = sha256(`${manifest.name} ${args.path}`).slice(0, 12);

        let dst = args.path;
        dst = path.resolve(manifest.workdir, dst);
        dst = path.join(layer.path, dst);

        let volume = volumes.has(args.name)
            ? volumes.get(args.name)
            : volumes.create(args.name);

        let src = volume.path;

        ensureDir(dst);

        let result = spawnSync('mount_nullfs', [
            src, dst,
        ]);

        if (result.status !== 0)
            throw new Error('Error execution mount_nullfs.');

    }

}

module.exports = new Mount;
