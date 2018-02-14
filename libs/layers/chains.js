'use strict';

const Chain = require('./chain.js');

class Chains {

    constructor() {

        this._pool = {};

    }

    create(name, pool, layer = null) {

        let chain = new Chain(pool, layer);
        this._pool[name] = chain;

        return this._pool[name];

    }

    delete(name) { delete(this._pool[name]); }

    get(name) {

        if (this.has(name)) {

            return this._pool[name];

        } else {

            let msg = `Chain ${name} not found`;
            throw new Error(msg);

        }

    }

    has(name) { return this._pool[name] ? true : false; }

}

module.exports = new Chains;
