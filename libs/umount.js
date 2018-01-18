'use strict';

const {spawn, spawnSync} = require('child_process');
const ExecutionError = require('./Errors/execution-error.js');

module.exports = (dst, force = false) => {

    force = force ? '-f' : '';
    let result = spawnSync('/sbin/umount', [force, dst]);

    if (result.status !== 0)
        throw new ExecutionError('Error execution mount.');

}
