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
const recorderPool = require('./libs/recorder-pool.js');

const dhcp = require('./modules/ip-dhcp.js');
const autoIface = require('./modules/auto-iface.js');
const autoIp = require('./modules/auto-ip.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const start = require('./actions/start.js');
const stop = require('./actions/stop.js');
const sigHandler = require('./actions/sig-handler.js');

app.use(bodyParser.json());

process.on('SIGINT', sigHandler);
process.on('SIGTERM', sigHandler);

app.post('/jails', async (req, res) => {

    console.log(req.body);

    let configBody = new ConfigBody(req.body);
    let name = configBody.jailName;

    if (dataJails.has(name)) {

        let msg = `Jail "${name}" already exists.`;
        res.status(409).send(msg);
        return;

    }

    let log = logsPool.create(name);

    try {

        await log.notice('starting...\n');
        await start(configBody);
        await log.notice('finish.\n', true);

    } catch (e) {

        await log.crit(`\n${e.toString()}\n`, true);
        logsPool.delete(name);
        console.log(e);

    } finally {

        res.send();

    }

});

app.delete('/jails/:name', async (req, res) => {

    let name = req.params.name;

    if (!dataJails.has(name)) {

        let msg = `Jail "${name}" not found.`;
        res.status(404).send(msg);
        return;

    }

    let log = {};

    try {

        log = logsPool.get(name);

    } catch (error) {

        let msg = `Log "${name}" not found.`;
        res.status(500).send(msg);
        return;

    }

    try {

        await log.notice('stopping...\n');
        await stop(name);
        await log.notice('finish\n', true);

        logsPool.delete(name);

    } catch (e) {

        await log.crit(`\n${e.toString()}\n`, true);
        console.log(e);

    } finally {

        res.send();

    }

});

app.get('/jails/', async (req, res) => {

    let names = dataJails.getNames().map(name => {

        return {
            name: name,
            ref: `/jails/${name}`,
        };

    });

    res.json(names);

});

app.get('/jails/:name', async (req, res) => {

    let ret = {};

    try {

        let jail = dataJails.get(req.params.name);
        ret.name = jail.name;
        ret.working = jail.isWorking();
        ret.info = jail.info;
        Object.assign(ret, jail.configBody);
        delete(ret.fileData);

        ret.links = {
            log: `/jails/${jail.name}/log`,
        };

        res.json(ret);

    } catch (e) {

        if (e.name === 'NotFoundError')
            res.status(404).send(e.message);

        else res.status(500).send(e.message);

    }

});

app.get('/jails/:name/log', async (req, res) => {

    try {

        let log = logsPool.get(req.params.name);
        res.json({ data: log.toString() });

    } catch (e) {

        if (e.name === 'NotFoundError')
            res.status(404).send(e.message);

        else res.status(500).send(e.message);

    }

});

server.listen(config.port, config.host, () => {

    console.log(`listening on port ${config.port}!`);

});
