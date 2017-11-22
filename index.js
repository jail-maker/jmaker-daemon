#!/usr/bin/env node

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const tar = require('tar');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');

const fetch = require('./libs/bsd-fetch.js');
const ConfigBody = require('./libs/config-body.js');
const Rctl = require('./libs/rctl.js');
const FolderStorage = require('./libs/folder-storage.js');
const ZfsStorage = require('./libs/zfs-storage.js');
const config = require('./libs/config.js');

const IpDHCP = require('./modules/ip-dhcp.js');
const autoIface = require('./modules/auto-iface.js');
const autoIp = require('./modules/auto-ip.js');

const app = express();
const dhcp = new IpDHCP;

app.use(bodyParser.json());

app.post('/jails', (req, res) => {

    console.log(req.body);

    let configBody = new ConfigBody(req.body);
    let archive = `${path.join(config.cacheDir, configBody.base)}.tar`;

    try {

        let fd = fs.openSync(archive, 'r');
        fs.closeSync(fd);

    } catch(e) {

        if (e.code !== 'ENOENT') {

            console.log(e);
            req.send();
            return;

        }

        let result = fetch(`${config.bases}/${configBody.base}.tar`, archive);
        if (!result) {

            console.log('error fetching file.');

            req.send();
            return;

        }

    }

    console.log('archive done!');

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

    console.log('storage done!');

    fs.copyFileSync('/etc/resolv.conf', `${configBody.path}/etc/resolv.conf`);

    console.log('resolv.conf sync done!');

    configBody.mounts.forEach(points => {

        let [src, dst] = points;

        let result = spawnSync('mount_nullfs', [
            src,
            path.join(configBody.path, dst),
        ]);

    });

    console.log('mounts done!');

    let rctlObj = new Rctl(configBody.rctl, configBody.jailName);
    rctlObj.execute();

    console.log('rctl done!');

    let configFile = `/tmp/${configBody.jailName}-jail.conf`;
    let configObj = configBody.getConfigJail();

    configObj
        .pipe(autoIface.pipeRule.bind(autoIface))
        .pipe(autoIp.pipeRule.bind(autoIp))
        .pipe(dhcp.pipeRule.bind(dhcp));

    console.log(configObj.toString());

    configObj.save(configFile);

    console.log('jail config done!');

    let result = spawnSync('jail', [
        '-c', '-f', configFile, configBody.jailName,
    ]);

    console.log('jail start done!');

    console.log(result.output[1].toString());
    console.log(result.output[2].toString());

    if (configBody.cpuset !== false) {
        result = spawnSync('cpuset', [
            '-l', configBody.cpuset, '-j', jid
        ]);
    }

    console.log('cpuset done!');

    if (configBody.pkg) {
        result = spawnSync('pkg', [
            '-j', configBody.jailName, 'install', '-y', ...configBody.pkg
        ]);

        console.log(result.output[1].toString());
        console.log(result.output[2].toString());
    }

    console.log('pkg done!');

    configBody.jPostStart.forEach(command => {

        result = spawnSync('/usr/sbin/jexec', [
            jid, ...command.split(' ')
        ]);

        console.log(result.output[1].toString());
        console.log(result.output[2].toString());

    });

    console.log('j-poststart done!');
    console.log('finish');

    res.send();

});

app.delete('/jails/:name', (req, res) => {

    let jailName = req.params.name;
    let configFile = `/tmp/${jailName}-jail.conf`;

    let result = spawnSync('jail', [
        '-r',
        '-f',
        configFile,
        jailName,
    ]);

    console.log(result.output[1].toString());
    console.log(result.output[2].toString());

    fs.unlinkSync(configFile);

    console.log('finish');

    res.send();

});

app.listen(config.port, config.host, () => {

    console.log(`listening on port ${config.port}!`);

});
