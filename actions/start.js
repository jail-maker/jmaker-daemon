'use strict';

const { spawnSync, spawn } = require('child_process');
const { mkdirSync } = require('mkdir-recursive');
const path = require('path');
const fs = require('fs');
const os = require('os');
const tar = require('tar');
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

async function start(configBody) {

    let log = logsPool.get(configBody.jailName);
    let recorder = new Recorder;
    let zfs = new Zfs(config.zfsPool);
    let layers = zfsLayersPool.create(configBody.jailName, 'empty');

    if (!zfs.has('empty')) zfs.create('empty');
    recorderPool.set(configBody.jailName, recorder);

    // await log.info('checking base... ');
    if (configBody.base) {

        await layers.create(configBody.base, async storage => {

            await log.info('fetching base... ');
            let archive = `${path.join('/tmp', configBody.base)}.tar`;
            let result = fetch(`${config.bases}/${configBody.base}.tar`, archive);

            if (!result) {

                throw new Error('error fetching file.');

            }
            await log.notice('done\n');

            await log.info('decompression... ');
            tar.x({
                file: archive,
                cwd: storage.getPath(),
                sync: true,
            });

            fs.unlinkSync(archive);
            await log.notice('done\n');

        });

    }

    await log.info('rctl... ');

    let rctlObj = new Rctl(configBody.rctl, configBody.jailName);
    await recorder.run(rctlObj);

    await log.notice('done\n');

    await log.notice('installing packages...\n');

    if (configBody.pkg.length) {

        let name = `${configBody.pkg.join(' ')} ${configBody.jailName}`;
        await layers.create(name, async storage => {

            let pkg = new Pkg(configBody.pkg);
            pkg.output(log);
            pkg.chroot(storage.getPath());

            await recorder.run(pkg);

        });

    }

    if (configBody.pkgRegex.length) {

        let name = `${configBody.pkgRegex.join(' ')} ${configBody.jailName}`;
        await layers.create(name, async storage => {

            let pkg = new Pkg(configBody.pkgRegex);
            pkg.output(log);
            pkg.chroot(storage.getPath());
            pkg.regex(true);

            await recorder.run(pkg);

        });

    }

    await log.notice('done\n');

    await log.info('copy... ');

    let modCopy = new ModCopy(configBody.jailName, configBody.copy);
    await recorder.run(modCopy);

    await log.notice('done\n');

    await log.notice('j-prestart...\n');

    let jPreStart = new JPreStart(
        configBody.jailName,
        configBody.jPreStart,
        configBody.env
    );
    await recorder.run(jPreStart);

    await log.notice('done\n');

    let jail = {};

    await layers.create(
        new RawArgument(configBody.jailName),
        async storage => {

            if (configBody.resolvSync) {

                await log.info('resolv.conf sync... ');

                fs.copyFileSync(
                    '/etc/resolv.conf',
                    `${storage.getPath()}/etc/resolv.conf`
                );

                await log.notice('done\n');

            }

            if (configBody.quota) storage.setQuota(configBody.quota);
            configBody.setPath(storage.getPath());

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

        }, false);

    await log.info('mounting... ');

    let mounts = new Mounts(configBody.mounts, configBody.path);
    await recorder.run(mounts);

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

        try {

            let cpuset = new Cpuset(jail.info.jid, configBody.cpuset);
            await recorder.run(cpuset);

        } catch (error) {

            await recorder.rollback();
            throw error;

        }

        await log.notice('done\n');

    }

    await log.notice('j-poststart...\n');

    let jPostStart = new JPostStart(
        configBody.jailName,
        configBody.jPostStart,
        configBody.env
    );
    await recorder.run(jPostStart);

    await log.notice('done\n');

    let hosts = new Hosts(jail);
    await recorder.run(hosts);

    return;

}

module.exports = start;
