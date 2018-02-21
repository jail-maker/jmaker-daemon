'use strict';

const uniqid = require('uniqid');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { removeSync } = require('fs-extra');

class Context {

    constructor() {

        let dir = path.join(os.tmpdir(), 'context-');

        this.path = fs.mkdtempSync(dir);
        this.destroyed = false;

    }

    destroy() {

        removeSync(this.path);
        this.destroyed = true;

    }

}

module.exports = Context;
