'use strict';

const { spawnSync } = require('child_process');
const { ensureDirSync } = require('fs-extra');
const path = require('path');
const sha256 = require('js-sha256').sha256;
const config = require('../libs/config');
const logsPool = require('../libs/logs-pool');
const Layers = require('../libs/layers');
const chains = require('../libs/layers/chains');
const mountNullfs = require('../libs/mount-nullfs');
const umount = require('../libs/umount');

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
        let layers = new Layers(config.imagesLocation);
        let layer = layers.get(manifest.name);
        let volumes = new Layers(config.volumesLocation);

        args = this._normalizeArgs(args);

        if (args.path === undefined)
            throw new Error('volume path is undefined.');

        if (args.name === undefined)
            args.name = sha256(`${manifest.name} ${args.path}`).slice(0, 12);

        let dst = args.path;
        dst = path.resolve(manifest.workdir, dst);

        let volume = volumes.createIfNotExists(args.name);
        let src = volume.path;
        let absoluteDst = path.join(layer.path, dst);

        ensureDirSync(absoluteDst);
        mountNullfs(src, absoluteDst);

        scope.on('int', _ => {

            console.log(`umount volume: ${dst}`);
            umount(absoluteDst, true);

        });

        scope.on('close', _ => {

            console.log(`umount volume: ${dst}`);
            umount(absoluteDst, true);

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
