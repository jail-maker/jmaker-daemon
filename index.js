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
const dataJails = require('./libs/data-jails.js');

const dhcp = require('./modules/ip-dhcp.js');
const autoIface = require('./modules/auto-iface.js');
const autoIp = require('./modules/auto-ip.js');

const app = express();

const stop = require('./actions/stop.js');
const start = require('./actions/start.js');

app.use(bodyParser.json());

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

app.post('/jails', (req, res) => {

    console.log(req.body);

    let configBody = new ConfigBody(req.body);
    start(configBody);

    res.send();

});

app.delete('/jails/:name', (req, res) => {

    stop(req.params.name);
    res.send();

});

app.listen(config.port, config.host, () => {

    console.log(`listening on port ${config.port}!`);

});
