'use strict';

const { spawnSync, spawn } = require('child_process');
const { mkdirSync } = require('mkdir-recursive');
const path = require('path');
const fs = require('fs');
const os = require('os');
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

const Mounts = require('../modules/mounts.js');
const Cpuset = require('../modules/cpuset.js');
const Pkg = require('../modules/pkg.js');
const JPostStart = require('../modules/j-poststart.js');
const Hosts = require('../modules/hosts.js');

const Recorder = require('../libs/recorder.js');

async function start(configBody) {

    let log = logsPool.get(configBody.jailName);
    let archive = `${path.join(config.cacheDir, configBody.base)}.tar`;
    let recorder = new Recorder;

    try {

        await log.info('checking base... ');

        let fd = fs.openSync(archive, 'r');
        fs.closeSync(fd);

        await log.notice('done\n');

    } catch(e) {

        if (e.code !== 'ENOENT') {

            console.log(e);
            throw e;

        }

        await log.info('fetching base... ');

        let result = fetch(`${config.bases}/${configBody.base}.tar`, archive);

        if (!result) {

            throw new Error('error fetching file.');

        }

        await log.notice('done\n');

    }

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

        await log.info('decompression... ');

        tar.x({
            file: archive,
            cwd: configBody.path,
            sync: true,
        });

        await log.notice('done\n');

    }

    if (config.resolvSync) {

        await log.info('resolv.conf sync... ');
        fs.copyFileSync('/etc/resolv.conf', `${configBody.path}/etc/resolv.conf`);
        await log.notice('done\n');

    }

    await log.info('mounting... ');

    let mounts = new Mounts(configBody.mounts, configBody.path);
    await recorder.run(mounts);

    await log.notice('done\n');

    await log.info('rctl... ');

    let rctlObj = new Rctl(configBody.rctl, configBody.jailName);
    await recorder.run(rctlObj);

    await log.notice('done\n');

    let jail = {};

    {

        let call = {
            run: _ => {

                jail = new Jail(configBody);
                dataJails.add(jail);

            },
            rollback: _ => {

                dataJails.unset(configBody.jailName);

            }
        }

        await recorder.run(call);

    }

    let configObj = jail.configFileObj;

    {

        let call = {
            run: _ => {

                configObj
                // .pipe(dhcp.getPipeRule(jail).bind(dhcp))
                    .pipe(autoIface.pipeRule.bind(autoIface))
                    .pipe(autoIp.pipeRule.bind(autoIp))
                    .pipe(configObj.out.bind(configObj));

            },
            rollback: _ => {}
        };

        await recorder.run(call);

    }

    await log.info(configObj.toString() + '\n');

    await log.notice('jail starting...\n');
    await recorder.run(jail);
    await log.notice('done\n');

    if (configBody.cpus) {

        let cpus = parseInt(configBody.cpus);
        let osCpus = os.cpus().length;
        cpus = cpus < osCpus ? cpus : osCpus;

        if (cpus === 1) configBody.cpuset = '0';
        else configBody.cpuset = `0-${cpus - 1}`;

    }

    if (configBody.cpuset !== false) {

        await log.info('cpuset... ');

        let cpuset = new Cpuset(jail.info.jid, configBody.cpuset);
        console.log(cpuset);
        await recorder.run(cpuset);

        await log.notice('done\n');

    }

    if (configBody.pkg.length) {

        await log.notice('package installing...\n');

        let pkg = new Pkg(configBody.jailName, configBody.pkg);
        await recorder.run(pkg);

        await log.notice('done\n');

    }

    await log.notice('j-poststart...\n');

    let jPostStart = new JPostStart(configBody.jailName, configBody.jPostStart);
    await recorder.run(jPostStart);

    await log.notice('done\n');

    let hosts = new Hosts(jail);
    await recorder.run(hosts);

    return;

}

module.exports = start;
