'use strict';

const { spawnSync, spawn } = require('child_process');
const { mkdirSync } = require('mkdir-recursive');
const path = require('path');
const fs = require('fs');
const os = require('os');
const sha256 = require('js-sha256').sha256;

const fetch = require('../libs/bsd-fetch.js');
const config = require('../libs/config.js');
const dataJails = require('../libs/data-jails.js');
const FolderStorage = require('../libs/folder-storage.js');
const ZfsStorage = require('../libs/zfs-storage.js');
const Zfs = require('../libs/zfs.js');
const zfsLayersPool = require('../libs/zfs-layers-pool.js');
const logsPool = require('../libs/logs-pool.js');
const Rctl = require('../libs/rctl.js');
const Jail = require('../libs/jail.js');
const recorderPool = require('../libs/recorder-pool.js');
const RawArgument = require('../libs/raw-argument.js');

const dhcp = require('../modules/ip-dhcp.js');
const autoIface = require('../modules/auto-iface.js');
const autoIp = require('../modules/auto-ip.js');

const Mounts = require('../modules/mounts.js');
const Cpuset = require('../modules/cpuset.js');
const Pkg = require('../modules/pkg.js');
const JPreStart = require('../modules/j-prestart.js');
const JPostStart = require('../modules/j-poststart.js');
const Hosts = require('../modules/hosts.js');
const ModCopy = require('../modules/copy.js');

const Recorder = require('../libs/recorder.js');

async function start(manifest) {

    let log = logsPool.get(manifest.name);
    let recorder = new Recorder;
    let jail = {};
    let layers = new Layers(config.zfsPool);
    let layer = layers.get(manifest.name);
    let storage = layer;

    recorderPool.set(manifest.name, recorder);

    if (manifest['resolv-sync']) {

        await log.info('resolv.conf sync... ');

        fs.copyFileSync(
            '/etc/resolv.conf',
            `${storage.path}/etc/resolv.conf`
        );

        await log.notice('done\n');

    }

    if (manifest.quota) storage.setQuota(manifest.quota);
    manifest.setPath(storage.path);

    {

        let call = {
            run: _ => {

                jail = new Jail(manifest);
                dataJails.add(jail);

            },
            rollback: _ => {

                dataJails.unset(manifest.name);

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

    await log.info('rctl... ');
    let rctlObj = new Rctl(manifest.rctl, manifest.name);
    await recorder.run(rctlObj);
    await log.notice('done\n');

    await log.info('mounting... ');
    let mounts = new Mounts(manifest.mounts, manifest.path);
    await recorder.run(mounts);
    await log.notice('done\n');

    await log.info(configObj.toString() + '\n');

    await log.notice('jail starting...\n');
    await recorder.run(jail);
    await log.notice('done\n');

    let hosts = new Hosts(jail);
    await recorder.run(hosts);

    if (manifest.cpus) {

        let cpus = parseInt(manifest.cpus);
        let osCpus = os.cpus().length;
        cpus = cpus < osCpus ? cpus : osCpus;

        if (cpus === 1) manifest.cpuset = '0';
        else manifest.cpuset = `0-${cpus - 1}`;

    }

    if (manifest.cpuset !== false) {

        await log.info('cpuset... ');

        try {

            let cpuset = new Cpuset(jail.info.jid, manifest.cpuset);
            await recorder.run(cpuset);

        } catch (error) {

            await recorder.rollback();
            throw error;

        }

        await log.notice('done\n');

    }

    await log.notice('j-poststart...\n');

    let jPostStart = new JPostStart(
        manifest.name,
        manifest['exec.j-poststart'],
        manifest.env
    );
    await recorder.run(jPostStart);

    await log.notice('done\n');
    return;

}

module.exports = start;
