'use strict';

const { spawnSync } = require('child_process');
const { ensureDirSync } = require('fs-extra');
const path = require('path');
const sha256 = require('js-sha256').sha256;
const config = require('../libs/config.js');
const logsPool = require('../libs/logs-pool.js');
const Layers = require('../libs/layers');
const chains = require('../libs/layers/chains.js');
const mountNullfs = require('../libs/mount-nullfs.js');
const umount = require('../libs/umount.js');

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
            scope,
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
            ensureDirSync(absoluteDst);
            mountNullfs(src, absoluteDst);

        });

        chain.on('postcall', layer => {

            umount(path.join(layer.path, dst), true);

        });

        chain.on('fail', layer => {

            umount(path.join(layer.path, dst), true);

        });

        scope.on('int', _ => {

            console.log('umount');
            let layer = chain.getCurrent();
            umount(path.join(layer.path, dst), true);

        });

    }

    async _doStarting(data = {}) {

        let {
            manifest,
            args = {},
            recorder,
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


        let record = {
            run: _ => {
                ensureDirSync(dst);
                mountNullfs(src, dst); 
            },
            rollback: _ => { umount(dst, true); },
        };

        await recorder.run({ record });

    }

}

module.exports = new Mount;
