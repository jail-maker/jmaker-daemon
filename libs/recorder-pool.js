'use strict';

const NotFoundError = require('./errors/not-found-error.js');

class RecorderPool {

    constructor() {

        this._pool = {};

    }

    set(name, recorder) {

        this._pool[name] = recorder;

    }

    get(name) {

        if(!this.has(name))
            throw new NotFoundError(`Recorder ${name} not found.`);

        return this._pool[name];

    }

    has(name) {

        if(!this._pool[name])
            return false;

        return true;

    }

}

module.exports = new RecorderPool;
