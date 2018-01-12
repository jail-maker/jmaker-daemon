'use strict';

const ZfsLayers = require('./zfs-layers.js');
const NotFoundError = require('./Errors/not-found-error.js');

class ZfsLayersPool {

    constructor() {

        this._pool = {};

    }

    create(name, layer) {

        let layers = new ZfsLayers(layer);
        this._pool[name] = layers;

        return this._pool[name];

    }

    delete(name) { delete(this._pool[name]); }

    get(name) {

        if (this.has(name)) {

            return this._pool[name];

        } else {

            let msg = `layers ${name} not found`;
            throw new NotFoundError(msg);

        }

    }

    has(name) { return this._pool[name] ? true : false; }

}

module.exports = new ZfsLayersPool;
