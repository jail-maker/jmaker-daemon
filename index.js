#!/usr/bin/env node

const yaml = require('js-yaml');
const minimist = require('minimist');
const express = require('express');
const bodyParser = require('body-parser');

const jailsDir = __dirname + '/jails';
const port = 3346;
const host = '0.0.0.0';
const app = express();

app.use(bodyParser.json());

app.post('/jails', (req, res) => {

    let configData = req.body;

    tar.x({
        file: configData.base + '.tar',
        cwd: `${jailsDir}/${configData.name}`,
    })
        .then(_ => {
            console.log('finish');
        })

    res.send();

});

app.listen(port, host, () => {
    console.log(`listening on port ${port}!`);
});
