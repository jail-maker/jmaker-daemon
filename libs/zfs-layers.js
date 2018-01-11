'use strict';

const sha256 = require('js-sha256').sha256;
const Zfs = require('./zfs.js');
const ZfsStorage = require('./zfs-storage.js');
const config = require('./config.js');
const RawArgument = require('./raw-argument.js');

class ZfsLayers {

    constructor(layer) {

        this._layers = [layer];
        this._current = layer;
        this._counter = 1;

    }

    async create(name, call, cacheable = true) {

        if (!(name instanceof RawArgument)) {

            name = sha256(`${++this._counter} ${name}`);

        } else {

            name = name.getData();

        }

        let zfs = new Zfs(config.zfsPool);

        if (!cacheable && zfs.has(name)) zfs.destroy(name);
        if (!zfs.has(name)) {

            zfs.clone(this._current, 'jmaker', name);
            let storage = new ZfsStorage(config.zfsPool, name);

            try {

                await call(storage);

            } catch(error) {

                zfs.destroy(name);
                throw error;

            }

            zfs.snapshot(name, 'jmaker');

        }

        this._current = name;
        this._layers.push(name);

    }

}

module.exports = ZfsLayers;
