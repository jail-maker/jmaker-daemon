#!/usr/bin/env node

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

const ConfigFile = require('./libs/config-file.js');
const Rctl = require('./libs/rctl.js');

const IpDHCP = require('./modules/ip-dhcp.js');

const jailsDir = path.resolve(__dirname + '/jails');
const ARGV = minimist(process.argv.slice(2));

const {
    port = 3346,
    host = '127.0.0.1',
} = ARGV;

const app = express();
const dhcp = new IpDHCP;

app.use(bodyParser.json());

app.post('/jails', (req, res) => {

    console.log(req.body);

    let configData = req.body;
    let jailDir = `${jailsDir}/${configData.name}`;
    configData.path = jailDir;

    try {

        fs.mkdirSync(jailDir);

        tar.x({
            file: configData.base + '.tar',
            cwd: jailDir,
            sync: true,
        });

    } catch(e) {

        if (e.code !== 'EEXIST') {

            console.log(e);
            process.exit();

        }

    }

    delete(configData.base);

    let jailName = configData.name;
    delete(configData.name);

    let dependencies = configData.dependencies;
    delete(configData.dependencies);

    let rctl = configData.rctl;
    delete(configData.rctl);

    let cpuset = configData.mounts;
    delete(configData.cpuset);

    let mounts = configData.mounts;
    delete(configData.mounts);

    mounts.forEach(points => {

        let [src, dst] = points;

        let result = spawnSync('mount_nullfs', [
            src,
            path.join(configData.path, dst),
        ]);

    });

    let rctlObj = new Rctl(rctl, jailName);
    rctlObj.execute();

    let configFile = path.resolve('./tmp-jail.conf');
    let configObj = new ConfigFile(configData, jailName);

    configObj.pipe(rules => {

        let ipsRule = rules['ip4.addr'];

        if (ipsRule.data === 'DHCP') {

            if (!dhcp.isEnabled()) dhcp.enable();

            let iface = dhcp.getIface();
            iface.execDhcp();

            let eth = iface.getEthName();
            let ip4 = iface.getIp4Addr();

            ipsRule.view = `ip4.addr = "${eth}|${ip4}";`;

        }

        return rules;

    });

    console.log(configObj.toString());

    configObj.save(configFile);

    let result = spawnSync('jail', [
        '-c', '-f', configFile, jailName,
    ]);

    console.log(result.output[1].toString());
    console.log(result.output[2].toString());

    result = spawnSync('jls', [
        '--libxo=json', '-j', jailName
    ]);

    let out = result.stdout.toString();
    out = JSON.parse(out);
    let jid = out['jail-information'].jail[0].jid;

    console.log(jid);

    result = spawnSync('cpuset', [
        '-l', cpuset, '-j', jid
    ]);

    console.log('finish');

    res.send();

});

app.delete('/jails/:name', (req, res) => {

    let jailName = req.params.name;
    let configFile = path.resolve('./tmp-jail.conf');

    let result = spawnSync('jail', [
        '-r',
        '-f',
        configFile,
        jailName,
    ]);

    console.log(result.output[1].toString());
    console.log(result.output[2].toString());

    console.log('finish');

    res.send();

});

app.listen(port, host, () => {

    console.log(`listening on port ${port}!`);

});
