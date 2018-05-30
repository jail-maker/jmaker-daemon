'use strict';

const NotFoundError = require('../errors/not-found-error.js');
const ExistsError = require('../errors/exists-error.js');

class JailsPool {

    constructor() {

        this._data = {};

    }

    get ids() {

        return Object.keys(this._data); 

    }

    get(id) {

        if (!this._data[id]) {

            let msg = `Key "${id}" not found.`;
            throw new NotFoundError(msg);

        }

        return this._data[id];

    }

    set(id, jail) {

        if (this._data[id]) {

            let msg = `Key "${id}" already exists.`;
            throw new ExistsError(msg);

        }

        this._data[id] = jail;

    }

    has(id) {

        return this._data[id] ? true : false;

    }

    getAll() {

        return this._data;

    }

    unset(id) {

        delete(this._data[id]);

    }

}

module.exports = new JailsPool;

