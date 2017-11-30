#!/usr/bin/env node

'use strict';

var stream = require('express-stream');

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
const dataJails = require('./libs/data-jails.js');
const logsPool = require('./libs/logs-pool.js');

const dhcp = require('./modules/ip-dhcp.js');
const autoIface = require('./modules/auto-iface.js');
const autoIp = require('./modules/auto-ip.js');

const app = express();

const stop = require('./actions/stop.js');
const start = require('./actions/start.js');

app.use(bodyParser.json());
app.use(stream.pipe());

process.on('SIGINT', () => {

    dataJails.getNames().forEach(stop);
    dhcp.disable();
    process.exit();

});

process.on('SIGTERM', () => {

    dataJails.getNames().forEach(stop);
    dhcp.disable();
    process.exit();

});

app.get('/jails/:name/log-stream', (req, res) => {

    let name = req.params.name;
    let jail = dataJails.get(name);

    let log = logsPool.get(name);

    let messageListener = message => res.pipe(message);
    let finishListener = () => { 

        log.removeListener('message', messageListener);
        log.removeListener('finish', finishListener);
        res.close(); 

    };

    log.on('message', messageListener);
    log.on('finish', finishListener);

});

app.post('/jails', (req, res) => {

    console.log(req.body);

    let configBody = new ConfigBody(req.body);
    let log = logsPool.create(configBody.jailName);

    log.message('starting.');
    start(configBody);

    log.message('finish.');
    log.finish();
    res.send();

});

app.delete('/jails/:name', (req, res) => {

    let name = req.params.name;
    let log = logsPool.get(name);

    stop(name);

    log.message('finish.');
    log.finish();
    res.send();

});

app.listen(config.port, config.host, () => {

    console.log(`listening on port ${config.port}!`);

});
