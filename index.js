#!/usr/bin/env node

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const url = require('url');
const tar = require('tar');
const fs = require('fs');
const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const bodyParser = require('body-parser');

const fetch = require('./libs/bsd-fetch.js');
const ConfigBody = require('./libs/config-body.js');
const Rctl = require('./libs/rctl.js');
const FolderStorage = require('./libs/folder-storage.js');
const ZfsStorage = require('./libs/zfs-storage.js');
const Channel = require('./libs/channel.js');
const config = require('./libs/config.js');
const dataJails = require('./libs/data-jails.js');
const logsPool = require('./libs/logs-pool.js');

const dhcp = require('./modules/ip-dhcp.js');
const autoIface = require('./modules/auto-iface.js');
const autoIp = require('./modules/auto-ip.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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

app.post('/jails', async (req, res) => {

    console.log(req.body);

    let configBody = new ConfigBody(req.body);
    let name = configBody.jailName;
    let log = logsPool.create(name);

    await log.notice('starting...');

    await start(configBody);

    await log.notice('finish');
    await log.finish();

    res.send();

});

app.delete('/jails/:name', async (req, res) => {

    let name = req.params.name;
    let log = logsPool.get(name);

    await log.notice('stopping...');

    await stop(name);

    await log.notice('finish');
    await log.finish();

    logsPool.delete(name);

    res.send();

});

server.listen(config.port, config.host, () => {

    console.log(`listening on port ${config.port}!`);

});
