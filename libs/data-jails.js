'use strict';

const NotFoundError = require('./Errors/not-found-error.js');
const ExistsError = require('./Errors/exists-error.js');

class DataJails {

    constructor() {

        this._data = {};

    }

    getNames() {

        let names = [];
        for (let name in this._data) names.push(name);

        return names; 

    }

    get(name) {

        if (!this._data[name]) {

            let msg = `Key "${name}" not found.`;
            throw new NotFoundError(msg);

        }

        return this._data[name];

    }

    add(jail) {

        let name = jail.name;

        if (this._data[name]) {

            let msg = `Key "${name}" already exists.`;
            throw new ExistsError(msg);

        }

        this._data[name] = jail;

    }

    has(name) {

        return this._data[name] ? true : false;

    }

    getAll() {

        return this._data;

    }

    unset(name) {

        delete(this._data[name]);

    }

}

module.exports = new DataJails;
