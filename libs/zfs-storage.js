'use strict';

const fs = require('fs');
const path = require('path');
const Zfs = require('./zfs.js');

class ZfsStorage {

    constructor(pool, name) {

        this._pool = pool;
        this._name = name;
        this._zfs = new Zfs(pool);
        this._path = '';

        this._create();

    }

    _create() {

        this._zfs.create(this._name);
        this._path = this._zfs.get(this._name, 'mountpoint');

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
