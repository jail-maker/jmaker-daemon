'use strict';

const {spawn, spawnSync} = require('child_process');
const ExecutionError = require('./Errors/execution-error.js');

module.exports = (dst) => {

    let result = spawnSync('/sbin/mount', ['-t', 'devfs', 'devfs', dst]);

    if (result.status !== 0)
        throw new ExecutionError(`Error execution mount devfs to "${dst}".`);

}
