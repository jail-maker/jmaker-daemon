'use strict';

const fs = require('fs');
const path = require('path');
const Zfs = require('./zfs.js');

class ZfsStorage {

    constructor(pool, name) {

        this._pool = pool;
        this._name = name;
        this._zfs = new Zfs(pool);

    }

    create() {

        this._zfs.create(this._name);

    }

    setQuota(value) {

        this._zfs.set(this._name, 'quota', value);

    }

    getPath() {

        return this._zfs.get(this._name, 'mountpoint');

    }

    getName() {

        return this._name;

    }

    isEmpty() {

        let result = fs.readdirSync(this._path);
        return !result.length;

    }

}

module.exports = ZfsStorage;
