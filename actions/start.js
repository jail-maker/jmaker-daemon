'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const tar = require('tar');

const fetch = require('../libs/bsd-fetch.js');
const config = require('../libs/config.js');
const dataJails = require('../libs/data-jails.js');
const FolderStorage = require('../libs/folder-storage.js');
const ZfsStorage = require('../libs/zfs-storage.js');
const logsPool = require('../libs/logs-pool.js');
const Rctl = require('../libs/rctl.js');
const Jail = require('../libs/jail.js');

const dhcp = require('../modules/ip-dhcp.js');
const autoIface = require('../modules/auto-iface.js');
const autoIp = require('../modules/auto-ip.js');

function start(configBody) {

    let log = logsPool.get(configBody.jailName);
    let archive = `${path.join(config.cacheDir, configBody.base)}.tar`;

    try {

        let fd = fs.openSync(archive, 'r');
        fs.closeSync(fd);

    } catch(e) {

        if (e.code !== 'ENOENT') {

            console.log(e);
            throw e;

        }

        let result = fetch(`${config.bases}/${configBody.base}.tar`, archive);

        if (!result) {

            throw new Error('error fetching file.');

        }

    }

    log.notice('archive done!');

    let storage = {};

    if (config.zfs) {

        storage = new ZfsStorage(config.zfsPool, configBody.jailName);
        configBody.setPath(storage.getPath())

        if (configBody.quota) storage.setQuota(configBody.quota);

    } else {

        storage = new FolderStorage(config.jailsDir, configBody.jailName);
        configBody.setPath(storage.getPath())

    }

    if (storage.isEmpty()) {

        tar.x({
            file: archive,
            cwd: configBody.path,
            sync: true,
        });

    }

    log.notice('storage done!');

    fs.copyFileSync('/etc/resolv.conf', `${configBody.path}/etc/resolv.conf`);

    log.notice('resolv.conf sync done!');

    configBody.mounts.forEach(points => {

        let [src, dst] = points;

        let result = spawnSync('mount_nullfs', [
            src,
            path.join(configBody.path, dst),
        ]);

    });

    log.notice('mounts done!');

    let rctlObj = new Rctl(configBody.rctl, configBody.jailName);
    rctlObj.execute();

    log.notice('rctl done!');

    let jail = new Jail(configBody);
    dataJails.add(jail);
    let configObj = jail.configFileObj;

    configObj
        .pipe(autoIface.pipeRule.bind(autoIface))
        .pipe(autoIp.pipeRule.bind(autoIp))
        .pipe(dhcp.getPipeRule(jail).bind(dhcp));

    log.info(configObj.toString());

    jail.start();

    log.notice('jail start done!');

    if (configBody.cpuset !== false) {

        let result = spawnSync('cpuset', [
            '-l', configBody.cpuset, '-j', jid
        ]);

    }

    log.notice('cpuset done!');

    if (configBody.pkg) {

        let result = spawnSync('pkg', [
            '-j', configBody.jailName, 'install', '-y', ...configBody.pkg
        ]);

        log.info(result.output[1].toString());
        log.info(result.output[2].toString());

    }

    log.notice('pkg done!');

    configBody.jPostStart.forEach(command => {

        let result = spawnSync('/usr/sbin/jexec', [
            jid, ...command.split(' ')
        ]);

        log.info(result.output[1].toString());
        log.info(result.output[2].toString());

    });

    log.notice('j-poststart done!');

}

module.exports = start;
