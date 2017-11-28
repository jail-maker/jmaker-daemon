'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dataJails = require('../libs/data-jails.js');

function stop(jailName) {

    let dataCell = dataJails.get(jailName);
    let configFile = `/tmp/${jailName}-jail.conf`;

    let configBody = dataCell.configBody;

    let result = spawnSync('jail', [
        '-r', '-f', configFile, jailName,
    ]);

    console.log(result.output[1].toString());
    console.log(result.output[2].toString());

    fs.unlinkSync(configFile);

    configBody.mounts.forEach(points => {

        let [src, dst] = points;

        let result = spawnSync('umount', [
            '-f', path.join(configBody.path, dst),
        ]);

    });

    dataJails.unset(jailName);

}

module.exports = stop;
