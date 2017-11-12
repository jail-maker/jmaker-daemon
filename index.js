#!/usr/bin/env node

const { spawn, spawnSync } = require('child_process')
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const tar = require('tar');
const fs = require('fs');
const minimist = require('minimist');
const express = require('express');
const bodyParser = require('body-parser');

const jailsDir = path.resolve(__dirname + '/jails');
const ARGV = minimist(process.argv.slice(2));

const {
    port = 3346,
    host = '127.0.0.1',
} = ARGV;

const app = express();

app.use(bodyParser.json());

app.post('/jails', (req, res) => {

    console.log(req.body);

    let configData = req.body;
    let jailDir = `${jailsDir}/${configData.name}`;

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
    delete(configData.rctl);
    delete(configData.cpuset);

    // let argv = jailPipe.start(configData)
    //     .pipe(ip4)
    //     .pipe(ip6)
    //     .pipe(jailPipe.finish)

    let a = [
        `path=${jailDir}`,
        'mount.devfs',
        `name=${configData.name}`,
        `host.hostname=${configData.name}`,
        'exec.start=/bin/sh /etc/rc',
        'exec.stop=/bin/sh /etc/rc.shutdown',
        'allow.raw_sockets',
        'allow.socket_af',
    ];

    let result = spawnSync('jail', [
        '-c',
        ... a
    ]);

    console.log(result.output[1].toString());
    console.log(result.output[2].toString());

    console.log('finish');

    res.send();

});

app.listen(port, host, () => {

    console.log(`listening on port ${port}!`);

});
