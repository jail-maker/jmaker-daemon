'use strict';

const sha256 = require('js-sha256').sha256;
const RawArgument = require('../raw-argument.js');
const Layers = require('./layers.js');

class Chain {

    constructor(pool, parent = null) {

        this._pool = poolt;
        this._parent = parent;
        this._counter = 1;

    }

    async layer(name, call = _ => {}, cacheable = true) {

        if (!(name instanceof RawArgument)) {

            name = sha256(`${this._counter} ${name} ${this._parent}`);

        } else {

            name = name.getData();

        }

        let layers = new Layers(this._pool);

        if (!cacheable && layers.has(name)) layers.destroy(name);
        if (!layers.has(name)) {

            try {

                let layer = layers.create(name, this._parent);
                await call(layer);

            } catch (error) {

                layers.destroy(name);
                throw error;

            }

        }

        this._parent = name;
        this._counter++;

    }

}

module.exports = Chain;
