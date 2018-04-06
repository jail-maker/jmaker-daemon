'use strict';

const {spawn, spawnSync} = require('child_process');
const ExecutionError = require('./errors/execution-error.js');

module.exports = (src, dst) => {

    let result = spawnSync('/sbin/mount_nullfs', [ src, dst ]);

    if (result.status !== 0)
        throw new ExecutionError(`Error execution mount nullfs from "${src}" to "${dst}".`);

}
