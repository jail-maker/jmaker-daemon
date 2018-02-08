#!/usr/bin/env node

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const url = require('url');
const fs = require('fs');
const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const multiparty = require('connect-multiparty');
const reqest = require('request-promise-native');

const Repository = require('./libs/repository.js');
const fetch = require('./libs/bsd-fetch.js');
const ConfigBody = require('./libs/config-body.js');
const Rctl = require('./libs/rctl.js');
const FolderStorage = require('./libs/folder-storage.js');
const ZfsStorage = require('./libs/zfs-storage.js');
const ZfsLayers = require('./libs/zfs-layers.js');
const Zfs = require('./libs/zfs.js');
const Channel = require('./libs/channel.js');
const config = require('./libs/config.js');
const dataJails = require('./libs/data-jails.js');
const logsPool = require('./libs/logs-pool.js');
const recorderPool = require('./libs/recorder-pool.js');
const RawArgument = require('./libs/raw-argument.js');
const decompress = require('./libs/decompress.js');
const compress = require('./libs/compress.js');
const Layers = require('./libs/layers');

const dhcp = require('./modules/ip-dhcp.js');
const autoIface = require('./modules/auto-iface.js');
const autoIp = require('./modules/auto-ip.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const create = require('./actions/create.js');
const start = require('./actions/start.js');
const stop = require('./actions/stop.js');
const sigHandler = require('./actions/sig-handler.js');

app.use(bodyParser.json());
app.use(multiparty());

process.on('SIGINT', sigHandler);
process.on('SIGTERM', sigHandler);

// { meta: '' } -> POST /context/  -> { id: '222', _links: []}
// /context/222/data 404
// POST /context/222/data

// POST file /context/ - > { id: '', meta: '' }
// {..., context_id: ''} -> POST /jails/create


app.get('/images', async (req, res) => {

    res.json({
        first: {
            name: 'first',
            links: { }
        },
        second: {
            name: 'second',
            links: { }
        }
    });

});

app.get('/images/:image', (req, res) => {

    res.status = 404;
    res.send();

});

app.post('/images/push-to-repo', async (req, res) => {

    try {
    
    let {
        image,
        repository = 'localhost'
    } = req.body;

    let repo = new Repository(repository);
    let layers = new Layers(config.zfsPool);

    let pushDeps = async image => {

        if (!image) return;
        if (await repo.hasImage(image)) {console.log('!!!');return;};
        let layer = layers.get(image);
        await pushDeps(layer.parent);
        await repo.push(image);

    };

    if (!layers.has(image)) {

        res.status = 404;
        res.send();

    }

    await pushDeps(image);
    res.send();
    } catch (e) {
        console.log(e);
    }

});

app.post('/images/download-from-repo', async (req, res) => {

    let {
        image,
        repository = 'localhost'
    } = req.body;

    let repo = new Repository(repository);
    let layers = new Layers(config.zfsPool);
    let parents = await repo.getParents(image);

    for (let i = 0; i < parents.length; i++) {

        let dep = parents[i];
        if (layers.has(dep.name)) continue;

        let meta = await repo.getMeta(dep.name);
        let archive = `/tmp/${meta.data.fileName}`;

        repo.downloadImage(dep.name, archive);
        let layer = layers.create(dep.name, dep.parent);
        layer.decompress(archive);

    }

    let meta = await repo.getMeta(image);
    let archive = `/tmp/${meta.data.fileName}`;
    let layer = layers.create(meta.data.name, meta.data.parent);

    repo.downloadImage(meta.data.name, archive);
    layer.decompress(archive);

    res.send();

});

app.post('/jails/create', async (req, res) => {

    console.log(req.body);
    console.log(req.files);

    let configBody = new ConfigBody(JSON.parse(req.body.body));
    let name = configBody.jailName;
    let log = logsPool.create(name);

    try {

        await log.notice('create...\n');
        await create(configBody);
        await log.notice('finish.\n', true);

    } catch (e) {

        await log.crit(`\n${e.toString()}\n`, true);
        logsPool.delete(name);
        console.log(e);

    } finally {

        res.send();

    }

});

app.post('/jails/start', async (req, res) => {

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
        await stop(configBody.jailName);
        await log.notice('finish.\n', true);

    } catch (e) {

        await log.crit(`\n${e.toString()}\n`, true);
        logsPool.delete(name);
        console.log(e);

    } finally {

        res.send();

    }

});

app.post('/jails/run', async (req, res) => {

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
        await create(configBody);
        await start(configBody);
        await stop(configBody.jailName);
        await log.notice('finish.\n', true);

    } catch (e) {

        await log.crit(`\n${e.toString()}\n`, true);
        logsPool.delete(name);
        console.log(e);

    } finally {

        res.send();

    }

});

app.delete('/jails/:name/stop', async (req, res) => {

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

server.timeout = null;
server.listen(config.port, config.host, () => {

    console.log(`listening on port ${config.port}!`);

});
