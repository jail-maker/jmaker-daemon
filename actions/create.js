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
const logsPool = require('../libs/logs-pool.js');
const Rctl = require('../libs/rctl.js');
const Jail = require('../libs/jail.js');
const RawArgument = require('../libs/raw-argument.js');
const decompress = require('../libs/decompress.js');

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

const chains = require('../libs/layers/chains.js');

async function create(manifest) {

    let log = logsPool.get(manifest.name);
    let chain = chains.create(
        manifest.name,
        config.zfsPool,
        manifest.from
    );

    if (manifest.pkg.length) {

        let name = `${manifest.pkg.join(' ')} ${manifest.from}`;
        await chain.layer(name, async storage => {

            let pkg = new Pkg(manifest.pkg);
            pkg.output(log);
            pkg.chroot(storage.path);
            await pkg.run();

        });

    }

    let modCopy = new ModCopy(manifest.name, manifest.copy);
    await modCopy.run();

    let jPreStart = new JPreStart(
        manifest.name,
        manifest['exec.j-prestart'],
        manifest.env
    );

    await jPreStart.run();

    chain.layer(new RawArgument(manifest.name), storage => {

        manifest.toFile(path.join(storage.path, '.manifest'));

    }, false);

    chains.delete(manifest.name);

}

module.exports = create;
