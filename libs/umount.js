'use strict';

const {spawn, spawnSync} = require('child_process');
const ExecutionError = require('./errors/execution-error.js');

module.exports = (dst, force = false) => {

    force = force ? '-f' : '';
    let result = spawnSync('/sbin/umount', [force, dst]);

    if (result.status !== 0) {

        let msg = 'Error execution umount.\n';
        msg += `/sbin/umount ${force} ${dst}\n`;
        msg += result.stdout.toString();
        throw new ExecutionError(msg);

    }

}
