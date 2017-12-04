'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dataJails = require('../libs/data-jails.js');
const logsPool = require('../libs/logs-pool.js');

function stop(jailName) {

    let log = logsPool.get(jailName);
    let jail = dataJails.get(jailName);
    let configBody = jail.configBody;

    jail.stop();

    configBody.mounts.forEach(points => {

        let [src, dst] = points;

        let result = spawnSync('umount', [
            '-f', path.join(configBody.path, dst),
        ]);

    });

    dataJails.unset(jailName);

}

module.exports = stop;
