#!/usr/bin/env node

'use strict';

const { spawn, spawnSync } = require('child_process')
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const jsonQuery = require('json-query');
const tar = require('tar');
const fs = require('fs');
const minimist = require('minimist');
const express = require('express');
const bodyParser = require('body-parser');

const ConfigBody = require('./libs/config-body.js');
const defaultIface = require('./libs/default-iface.js');
const ConfigFile = require('./libs/config-file.js');
const Rctl = require('./libs/rctl.js');

const IpDHCP = require('./modules/ip-dhcp.js');
const autoIface = require('./modules/auto-iface.js');
const autoIp = require('./modules/auto-ip.js');

const config = require('./libs/config.js');

const app = express();
const dhcp = new IpDHCP;

app.use(bodyParser.json());

app.post('/jails', (req, res) => {

    console.log(req.body);

    let configBody = new ConfigBody(req.body);

    try {

        fs.mkdirSync(configBody.path);

        tar.x({
            file: `${configBody.base}.tar`,
            cwd: configBody.path,
            sync: true,
        });


    } catch(e) {

        if (e.code !== 'EEXIST') {

            console.log(e);
            process.exit();

        }

    }

    fs.copyFileSync('/etc/resolv.conf', `${configBody.path}/etc/resolv.conf`);

    configBody.mounts.forEach(points => {

        let [src, dst] = points;

        let result = spawnSync('mount_nullfs', [
            src,
            path.join(configBody.path, dst),
        ]);

    });

    let rctlObj = new Rctl(configBody.rctl, configBody.jailName);
    rctlObj.execute();

    let configFile = path.resolve(`./${configBody.jailName}-jail.conf`);
    let configObj = configBody.getConfigJail();

    configObj
        .pipe(autoIface.pipeRule)
        .pipe(autoIp.pipeRule)
        .pipe(dhcp.pipeRule);

    console.log(configObj.toString());

    configObj.save(configFile);

    let result = spawnSync('jail', [
        '-c', '-f', configFile, configBody.jailName,
    ]);

    console.log(result.output[1].toString());
    console.log(result.output[2].toString());

    result = spawnSync('jls', [
        '--libxo=json', '-j', configBody.jailName
    ]);

    let out = result.stdout.toString();
    out = JSON.parse(out);
    let jid = out['jail-information'].jail[0].jid;

    console.log(jid);

    if (configBody.cpuset !== false) {
        result = spawnSync('cpuset', [
            '-l', configBody.cpuset, '-j', jid
        ]);
    }

    if (configBody.pkg) {
        result = spawnSync('pkg', [
            '-j', configBody.jailName, 'install', '-y', ...configBody.pkg
        ]);

        console.log(result.output[1].toString());
        console.log(result.output[2].toString());
    }

    configBody.jPostStart.forEach(command => {

        result = spawnSync('/usr/sbin/jexec', [
            jid, ...command.split(' ')
        ]);

        console.log(result.output[1].toString());
        console.log(result.output[2].toString());

    });

    console.log('finish');

    res.send();

});

app.delete('/jails/:name', (req, res) => {

    let jailName = req.params.name;
    let configFile = path.resolve(`./${jailName}-jail.conf`);

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
