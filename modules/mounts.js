'use strict';

const { spawnSync } = require('child_process');
const { ensureDir } = require('fs-extra');
const path = require('path');
const ExecutionError = require('../libs/Errors/execution-error.js');

class Mounts {

    constructor(mounts, dstPrefix = '/') {

        this._mounts = mounts;
        this._dstPrefix = dstPrefix;

    }

    async run() {

        this._mounts.forEach(points => {

            let [src, dst] = points;
            src = path.resolve('/', dst);
            dst = path.join(storage.getPath(), path.resolve(manifest.workdir, dst));

            ensureDir(dst);

            let result = spawnSync('mount_nullfs', [
                src, dst,
            ]);

            if (result.status !== 0)
                throw new ExecutionError('Error execution mount_nullfs.');

        });

    }

    async rollback() {

        this._mounts.forEach(points => {

            let [src, dst] = points;

            let result = spawnSync('umount', [
                '-f', path.join(this._dstPrefix, dst),
            ]);

        });

    }

}

module.exports = Mounts;
