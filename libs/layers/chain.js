'use strict';

const sha256 = require('js-sha256').sha256;
const RawArgument = require('../raw-argument.js');
const Layers = require('./layers.js');
const EventEmitter = require('events');

class Chain extends EventEmitter {

    constructor({ pool, parent = null, location = '/' }) {

        super();

        this._pool = pool;
        this._parent = parent;
        this._location = location;
        this._counter = 1;
        this._current = null;

    }

    async layer(name, call = _ => {}, cacheable = true) {

        if (!(name instanceof RawArgument)) {

            name = sha256(`${this._counter} ${name} ${this._parent}`);
            name = name.slice(0, 12);

        } else {

            name = name.getData();

        }

        let layers = new Layers(this._pool, this._location);

        if (!cacheable && layers.has(name)) layers.destroy(name);
        if (!layers.has(name)) {

            let layer = layers.create(name, this._parent);

            try {

                this.emit('precall', layer);
                await call(layer);
                this.emit('postcall', layer);
                this._current = layer;

            } catch (error) {

                this.emit('fail', layer);
                layers.destroy(name);
                throw error;

            }

        }

        this._parent = name;
        this._counter++;

    }

    getCurrent() {

        return this._current;

    }

}

module.exports = Chain;
