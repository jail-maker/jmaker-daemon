'use strict';

const { spawnSync, spawn } = require('child_process');
const { mkdirSync } = require('mkdir-recursive');
const path = require('path');
const fs = require('fs');
const os = require('os');
const sha256 = require('js-sha256').sha256;

const fetch = require('../libs/bsd-fetch');
const config = require('../libs/config');
const dataJails = require('../libs/data-jails');
const Zfs = require('../libs/zfs');
const Layers = require('../libs/layers');
const logsPool = require('../libs/logs-pool');
const Rctl = require('../libs/rctl');
const Jail = require('../libs/jails/jail');
const ruleViewVisitor = require('../libs/jails/rule-view-visitor');
const recorderPool = require('../libs/recorder-pool');
const RawArgument = require('../libs/raw-argument');

const dhcp = require('../modules/ip-dhcp');
const autoIface = require('../modules/auto-iface');
const autoIp = require('../modules/auto-ip');

const Cpuset = require('../modules/cpuset');
const Pkg = require('../modules/pkg');
const JPreStart = require('../modules/j-prestart');
const JPostStart = require('../modules/j-poststart');
const ModCopy = require('../modules/copy');

const Recorder = require('../libs/recorder');
const handlers = require('../handlers');
const datasets = require('../libs/datasets-db');

async function start(manifest) {

    let log = logsPool.get(manifest.name);
    let recorder = new Recorder;
    let jail = {};
    let dataset = await datasets.findOne({ name: manifest.name });
    let layers = new Layers(config.imagesLocation);
    let layer = layers.get(dataset.id);

    recorderPool.set(manifest.name, recorder);

    if (!layer.hasSnapshot('start')) {

        layer.snapshot('start');

    } else {

        layer.rollback('start');

    }

    if (manifest['resolv-sync']) {

        await log.info('resolv.conf sync... ');

        fs.copyFileSync(
            '/etc/resolv.conf',
            `${layer.path}/etc/resolv.conf`
        );

        await log.notice('done\n');

    }

    if (manifest.quota) layer.setQuota(manifest.quota);

    {

        let record = {
            run: _ => {

                jail = new Jail(manifest, layer.path);
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

    for (let index in manifest.starting) {

        let obj = manifest.starting[index];
        let command = Object.keys(obj)[0];
        let args = obj[command];

        let handler = handlers[command];
        await handler.do({
            index,
            layer,
            manifest,
            recorder,
            args,
            stage: 'starting',
        });

    }

    await log.notice('done\n');

}

module.exports = start;
