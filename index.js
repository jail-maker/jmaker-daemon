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

const ConfigFile = require('./config-file.js');

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

    let jailName = configData.name;
    delete(configData.name);

    delete(configData.base);
    delete(configData.rctl);
    delete(configData.cpuset);
    delete(configData.mounts);
    delete(configData.dependencies);

    let configFile = path.resolve('./tmp-jail.conf');
    let configObj = new ConfigFile(configData, jailName);

    console.log(configObj.toString());

    configObj.save(configFile);

    let result = spawnSync('jail', [
        '-c',
        '-f',
        configFile,
        jailName,
    ]);

    console.log(result.output[1].toString());
    console.log(result.output[2].toString());

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
