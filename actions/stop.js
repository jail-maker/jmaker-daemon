'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dataJails = require('../libs/data-jails.js');
const logsPool = require('../libs/logs-pool.js');
const hosts = require('../libs/hosts.js');

async function stop(jailName) {

    let log = logsPool.get(jailName);
    let jail = dataJails.get(jailName);
    let configBody = jail.configBody;
    let configObj = jail.configFileObj;

    await jail.stop();

    hosts.rmHost(jail.info['name']);
    hosts.rmHost(jail.info['host.hostname']);
    hosts.commit();

    configBody.mounts.forEach(points => {

        let [src, dst] = points;

        log.info(`umount ${src}\n`);

        let result = spawnSync('umount', [
            '-f', path.join(configBody.path, dst),
        ]);

    });

    dataJails.unset(jailName);
    return;

}

module.exports = stop;
