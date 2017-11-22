'use strict';

const fs = require('fs');
const path = require('path');
const Zfs = require('./zfs.js');

class ZfsStorage {

    constructor(pool, name) {

        this._pool = pool;
        this._name = name;
        this._new = false;
        this._zfs = new Zfs(pool);
        this._path = '';

        this._create();

    }

    _create() {

        let zfs = this._zfs;

        try {

            zfs.create(this._name);
            this._new = true;

        } catch (e) {

            if (e.code !== 'EEXIST') { throw e; }

        }

        this._path = zfs.get(this._name, 'mountpoint');

    }

    setQuota(value) {

        this._zfs.set(this._name, 'quota', value);

    }

    getPath() { return this._path; }

    isEmpty() {

        let result = fs.readdirSync(this._path);
        return !result.length;

    }

}

module.exports = ZfsStorage;
