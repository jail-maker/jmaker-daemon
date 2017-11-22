'use strict';

const fs = require('fs');
const path = require('path');

class FolderStorage {

    constructor(base, name) {

        this._base = base;
        this._name = name;
        this._path = path.join(base, name);
        this._new = false;

        this._create();

    }

    _create() {

        try {

            fs.mkdirSync(this._path);
            this._new = true;

        } catch (e) {

            if (e.code !== 'EEXIST') { throw e; }

        }

    }

    getPath() { return this._path; }

    isEmpty() {

        let result = fs.readdirSync(this._path);
        return !result.length;

    }

}

module.exports = FolderStorage;
