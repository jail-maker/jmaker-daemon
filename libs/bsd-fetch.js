'use strict';

const { spawn, spawnSync } = require('child_process');

module.exports = (url, dst) => {

    let result = spawnSync('/usr/bin/fetch', [
        url, '-o', dst
    ]);

    return result.status ? false : true;

}
