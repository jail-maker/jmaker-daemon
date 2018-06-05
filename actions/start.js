'use strict';

const { spawnSync, spawn } = require('child_process');
const { mkdirSync } = require('mkdir-recursive');
const path = require('path');
const fs = require('fs');
const os = require('os');
const sha256 = require('js-sha256').sha256;

const fetch = require('../libs/bsd-fetch');
const config = require('../libs/config');
const jailsPool = require('../libs/jails/jails-pool');
const Zfs = require('../libs/zfs');
const Layers = require('../libs/layers');
const logsPool = require('../libs/logs-pool');
const Rctl = require('../libs/rctl');
const Jail = require('../libs/jails/jail');
const ruleViewVisitor = require('../libs/jails/rule-view-visitor');
const invokersPool = require('../libs/invokers-pool');
const RawArgument = require('../libs/raw-argument');

const dhcp = require('../modules/ip-dhcp');
const autoIface = require('../modules/auto-iface');
const autoIp = require('../modules/auto-ip');

const Cpuset = require('../libs/cpuset');

const handlers = require('../handlers');
const datasets = require('../libs/datasets-db');
const CommandInvoker = require('../libs/command-invoker.js');

async function start(containerId, manifest) {

    let invoker = new CommandInvoker;
    let jail = {};
    let layers = new Layers(config.imagesLocation);
    let dataset = await datasets.findOne({ id: containerId });
    let containerName = dataset.name;
    let log = logsPool.get(containerId);
    let layer = layers.get(containerId);

    invokersPool.set(containerId, invoker);

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

        let command = {
            exec: async _ => {

                jail = new Jail({ manifest, path: layer.path, containerId });
                jailsPool.set(containerId, jail);

            },
            unExec: async _ => {

                jailsPool.unset(containerId);

            },
        };

        await invoker.submitOrUndoAll(command);

    }

    let configObj = jail.configFileObj;

    {

        let command = {
            exec: async _ => {

                configObj
                // .pipe(dhcp.getPipeRule(jail).bind(dhcp))
                    .accept(autoIface)
                    .accept(autoIp)
                    .accept(ruleViewVisitor);

            },
            unExec: async _ => {}
        };

        await invoker.submitOrUndoAll(command);

    }

    await log.info('rctl... ');
    let rctlObj = new Rctl({
        rulset: manifest.rctl,
        jailName: containerId
    });
    await invoker.submitOrUndoAll(rctlObj);
    await log.notice('done\n');

    await log.info(configObj.toString() + '\n');

    {
        await log.notice('jail starting...\n');

        let command = {
            exec: async _ => jail.start(),
            unExec: async _ => jail.stop(),
        };

        await invoker.submitOrUndoAll(command);
        await log.notice('done\n');
    }

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

            let cpuset = new Cpuset({
                jid: jail.info.jid, value: manifest.cpuset 
            });
            await invoker.submitOrUndoAll(cpuset);

        } catch (error) {

            await invoker.undoAll();
            throw error;

        }

        await log.notice('done\n');

    }

    await log.notice('starting...\n');

    for (let index in manifest.starting) {

        let obj = manifest.starting[index];
        let commandName = Object.keys(obj)[0];
        let args = obj[commandName];

        let commandPath = `../launcher-commands/${commandName}-command`;
        let CommandClass = require(commandPath);
        let command = new CommandClass({
            index,
            layer,
            containerId,
            manifest,
            args,
        });

        await invoker.submitOrUndoAll(command);

    }

    await log.notice('done\n');

}

module.exports = start;
