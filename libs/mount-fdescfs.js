'use strict';

const {spawn, spawnSync} = require('child_process');
const ExecutionError = require('./errors/execution-error.js');

module.exports = (dst) => {

    let result = spawnSync('/sbin/mount', ['-t', 'fdescfs', 'null', dst]);

    if (result.status !== 0)
        throw new ExecutionError(`Error execution mount devfs to "${dst}".`);

}
