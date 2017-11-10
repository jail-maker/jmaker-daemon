#!/usr/bin/env node

const { spawn, spawnSync } = require('child_process')
const yaml = require('js-yaml');
const tar = require('tar');
const fs = require('fs');
const minimist = require('minimist');
const express = require('express');
const bodyParser = require('body-parser');

const jailsDir = __dirname + '/jails';
const port = 3346;
const host = '127.0.0.1';
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

    let result = spawnSync('jail', [
        '-c', ...agv
        `path=${jailDir}`,
        `name=${configData.name}`,
        `exec.start=${configData['exec.start']}`,
    ]);

    console.log(result.output[1].toString());
    console.log(result.output[2].toString());

    console.log('finish');

    res.send();

});

app.listen(port, host, () => {

    console.log(`listening on port ${port}!`);

});
