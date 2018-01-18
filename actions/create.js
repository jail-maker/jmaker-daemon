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

async function create(configBody) {

    let log = logsPool.get(configBody.jailName);
    let zfs = new Zfs(config.zfsPool);
    let layers = zfsLayersPool.create(configBody.jailName, 'empty');

    if (!zfs.has('empty')) zfs.create('empty');

    // await log.info('checking base... ');
    if (configBody.base) {

        await layers.create(new RawArgument(configBody.base), async storage => {

            await log.info('fetching base... ');
            let archive = `${path.join('/tmp', configBody.base)}.tar`;
            let result = fetch(`${config.bases}/${configBody.base}.tar`, archive);

            if (!result) throw new Error('error fetching file.');
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

    await log.notice('installing packages...\n');

    if (configBody.pkg.length) {

        let name = `${configBody.pkg.join(' ')} ${configBody.base}`;
        await layers.create(name, async storage => {

            let pkg = new Pkg(configBody.pkg);
            pkg.output(log);
            pkg.chroot(storage.getPath());
            await pkg.run();

        });

    }

    if (configBody.pkgRegex.length) {

        let name = `${configBody.pkgRegex.join(' ')} ${configBody.base}`;
        await layers.create(name, async storage => {

            let pkg = new Pkg(configBody.pkgRegex);
            pkg.output(log);
            pkg.chroot(storage.getPath());
            pkg.regex(true);
            await pkg.run();

        });

    }

    await log.notice('done\n');

    await log.info('copy... ');

    let modCopy = new ModCopy(configBody.jailName, configBody.copy);
    await modCopy.run();

    await log.notice('done\n');

    await log.notice('j-prestart...\n');

    let jPreStart = new JPreStart(
        configBody.jailName,
        configBody.jPreStart,
        configBody.env
    );

    await jPreStart.run();
    await log.notice('done\n');

    await layers.create(new RawArgument(configBody.jailName), _ => {}, false);

    return;

}

module.exports = create;
