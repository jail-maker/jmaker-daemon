'use strict';

const Log = require('./log.js');
const NotFoundError = require('./errors/not-found-error.js');

class LogsPool {

    constructor() {

        this._pool = {};

    }

    create(name) {

        let log = new Log(name);
        this._pool[name] = log;

        return this._pool[name];

    }

    delete(name) { delete(this._pool[name]); }

    get(name) {

        if (this.has(name)) {

            return this._pool[name];

        } else {

            let msg = `log ${name} not found`;
            throw new NotFoundError(msg);

        }

    }

    has(name) { return this._pool[name] ? true : false; }

}

module.exports = new LogsPool;
