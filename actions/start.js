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
const Zfs = require('../libs/zfs.js');
const Layers = require('../libs/layers');
const logsPool = require('../libs/logs-pool.js');
const Rctl = require('../libs/rctl.js');
const Jail = require('../libs/jails/jail.js');
const ruleViewVisitor = require('../libs/jails/rule-view-visitor.js');
const recorderPool = require('../libs/recorder-pool.js');
const RawArgument = require('../libs/raw-argument.js');

const dhcp = require('../modules/ip-dhcp.js');
const autoIface = require('../modules/auto-iface.js');
const autoIp = require('../modules/auto-ip.js');

const Cpuset = require('../modules/cpuset.js');
const Pkg = require('../modules/pkg.js');
const JPreStart = require('../modules/j-prestart.js');
const JPostStart = require('../modules/j-poststart.js');
const Hosts = require('../modules/hosts.js');
const ModCopy = require('../modules/copy.js');

const Recorder = require('../libs/recorder.js');
const handlers = require('../handlers');

async function start(manifest) {

    let log = logsPool.get(manifest.name);
    let recorder = new Recorder;
    let jail = {};
    let layers = new Layers(config.imagesLocation);
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

    {

        let record = {
            run: _ => {

                jail = new Jail(manifest, storage.path);
                dataJails.add(jail);

            },
            rollback: _ => {

                dataJails.unset(manifest.name);

            }
        }

        await recorder.run({ record });

    }

    let configObj = jail.configFileObj;

    {

        let record = {
            run: _ => {

                configObj
                // .pipe(dhcp.getPipeRule(jail).bind(dhcp))
                    .accept(autoIface)
                    .accept(autoIp)
                    .accept(ruleViewVisitor);

            },
            rollback: _ => {}
        };

        await recorder.run({ record });

    }

    await log.info('rctl... ');
    let rctlObj = new Rctl(manifest.rctl, manifest.name);
    await recorder.run({ record: rctlObj });
    await log.notice('done\n');

    await log.info(configObj.toString() + '\n');

    await log.notice('jail starting...\n');
    await recorder.run({ record: jail });
    await log.notice('done\n');

    let hosts = new Hosts(jail);
    await recorder.run({ record: hosts });

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
            await recorder.run({ record: cpuset });

        } catch (error) {

            await recorder.rollback();
            throw error;

        }

        await log.notice('done\n');

    }

    await log.notice('starting...\n');

    for (let obj of manifest.starting) {

        let command = Object.keys(obj)[0];
        let args = obj[command];

        let handler = handlers[command];
        await handler.do({
            manifest,
            recorder,
            args,
            stage: 'starting',
        });

    }

    await log.notice('done\n');

}

module.exports = start;
