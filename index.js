#!/usr/bin/env node

'use strict';

const { spawnSync } = require('child_process');
const tempWrite = require('temp-write');
const tempfile = require('tempfile');
const tempdir = require('tempdir');
const uniqid = require('uniqid');
const path = require('path');
const url = require('url');
const fs = require('fs');
const fse = require('fs-extra');
const mime = require('mime');
const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const multiparty = require('connect-multiparty');
const reqest = require('request-promise-native');

const intProcessEmitter = require('./libs/interrupt-process-emitter.js');
const Repository = require('./libs/repository.js');
const fetch = require('./libs/bsd-fetch.js');
const ManifestFactory = require('./libs/manifest-factory.js');
const Manifest = require('./libs/manifest.js');
const Rctl = require('./libs/rctl.js');
const Channel = require('./libs/channel.js');
const config = require('./libs/config.js');
const dataJails = require('./libs/data-jails.js');
const logsPool = require('./libs/logs-pool.js');
const recorderPool = require('./libs/recorder-pool.js');
const RawArgument = require('./libs/raw-argument.js');
const decompress = require('./libs/decompress.js');
const compress = require('./libs/compress.js');
const Layers = require('./libs/layers');
const Context = require('./libs/context.js');

const dhcp = require('./modules/ip-dhcp.js');
const autoIface = require('./modules/auto-iface.js');
const autoIp = require('./modules/auto-ip.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const create = require('./actions/create.js');
const start = require('./actions/start.js');
const stop = require('./actions/stop.js');

app.use(bodyParser.json());
app.use(bodyParser.raw({ type: 'application/x-xz', limit: '500mb' }));
app.use(multiparty());

intProcessEmitter.prependListener('int', async _ => {

    try {

        await Promise.all(dataJails.getNames().map(stop));

    } catch (error) {

        console.log(error);

    }

});

app.get('/images', async (req, res) => {

    let {
        offset = 0,
        limit = 10,
    } = req.query;

    let layers = new Layers(config.imagesLocation);
    let images = layers.list().slice(offset, limit);

    let countPages = Math.ceil(images.length / limit);

    let nextOffset = offset + limit;
    nextOffset = nextOffset < images.length ? nextOffset : offset;

    let prevOffset = offset - limit;
    prevOffset = prevOffset >= 0 ? prevOffset : 0;

    res.json({
        items: images.map(image => {
            return {
                name: image,
                links: {
                    self: `/images/${image}`,
                },
            };
        }),
        countAllItems: images.length,
        countOnPage: limit,
        countPages: countPages,
        links: {
            next: `/images/?offset=${nextOffset}&limit=${limit}`,
            prev: `/images/?offset=${prevOffset}&limit=${limit}`,
        },
    });

});

app.post('/image-builder', async (req, res) => {

    console.log(req.body);
    console.log(req.files);

    let files = req.files;
    let body = JSON.parse(req.body.body);
    let manifest = ManifestFactory.fromFlatData(body);
    let name = manifest.name;
    let log = logsPool.create(name);

    let context = new Context;
    await decompress(files.context.path, context.path, {remove: true});

    try {

        await log.notice('create...\n');
        await create(manifest, context);
        await log.notice('finish.\n', true);

    } catch (e) {

        await log.crit(`\n${e.toString()}\n`, true);
        logsPool.delete(name);
        console.log(e);

    } finally {

        context.destroy();
        res.send();

    }

});

app.post('/image-importer', async (req, res) => {

    let tmpDir = undefined;
    let imageFile = undefined;
    let manifestFile = undefined;
    let layers = new Layers(config.imagesLocation);
    let mimeType = req.get('content-type');
    let ext = mime.getExtension(mimeType);

    if (!req.body.length) {

        res.status(400).send("Image file not found.");
        return;

    }

    try {

        imageFile = await tempWrite(req.body, `jmaker-image-${uniqid()}.${ext}`);
        tmpDir = await tempdir();
        manifestFile = path.join(tmpDir, '.manifest');

        let manifest = {};

        try {

            await decompress(imageFile, tmpDir, {files: ['.manifest']});
            manifest = ManifestFactory.fromFile(manifestFile);

        } catch (error) {

            res.status(400).send("Bad image format.");
            return;

        }

        if (layers.has(manifest.name)) {

            res.status(409).send(`Image ${manifest.name} already exists.`);
            return;

        }

        if (manifest.from && !layers.has(manifest.from)) {

            res.status(404).send(`Image ${manifest.from} not found.`);
            return;

        }

        try {

            let layer = layers.create(manifest.name, manifest.from);
            await layer.decompress(imageFile);
            res.send();

        } catch (error) {

            res.status(500).send();

        }

    } finally {

        if (imageFile) fse.removeSync(imageFile);
        if (tmpDir) fse.removeSync(tmpDir);

    }

});

app.get('/images/:image', (req, res) => {

    let layers = new Layers(config.imagesLocation);

    try {

        let layer = layers.get(req.params.image);

        res.json({
            data: {
                name: layer.name,
                parent: layer.parent,
            },
            links: {
                parent: layer.parent ? `/images/${layer.parent}` : null,
            }
        });

    } catch (error) {

        res.status(404);
        res.send();

    }

});

app.get('/images/:image/manifest', (req, res) => {

    let image = req.params.image;
    let layers = new Layers(config.imagesLocation);

    if (!layers.has(image)) {

        res.status(404);
        res.send();
        return;

    }

    let layer = layers.get(image);
    let manifestFile = path.join(layer.path, '.manifest');
    let manifest = {};

    try {

        manifest = ManifestFactory.fromFile(manifestFile);

    } catch (error) {

        manifest = new Manifest;
        manifest.name = image;
        manifest.from = layer.parent;

    }

    res.json(manifest);

});

app.delete('/images/:image', (req, res) => {

    let image = req.params.image;
    let layers = new Layers(config.imagesLocation);

    if (!layers.has(image)) {

        res.status(404);
        res.send(`Image ${image} not found.`);
        return;

    }

    Layers.destroy(image);
    res.send();

});

app.get('/images/:image/exported', async (req, res) => {

    let image = req.params.image;
    let layers = new Layers(config.imagesLocation);

    if (!layers.has(image)) {

        res.status(404);
        res.send(`Image ${image} not found.`);
        return;

    }

    let layer = layers.get(image);
    let archive = await layer.compress();
    res.attachment(archive)
        .sendFile(archive, {}, _ => fse.removeSync(archive));

});

app.post('/images/push-to-repo', async (req, res) => {

    res.status(503).send('deprecated');

    let {
        image,
        repository = 'localhost'
    } = req.body;

    let repo = new Repository(repository);
    let layers = new Layers(config.imagesLocation);

    let pushDeps = async image => {

        if (!image) return;
        if (await repo.hasImage(image)) return;
        let layer = layers.get(image);
        await pushDeps(layer.parent);
        await repo.push(image);

    };

    if (!layers.has(image)) {

        res.status(404);
        res.send();
        return;

    }

    await pushDeps(image);
    res.send();

});

app.post('/images/download-from-repo', async (req, res) => {

    res.status(503).send('deprecated');

    let {
        image,
        repository = 'localhost'
    } = req.body;

    let repo = new Repository(repository);
    let layers = new Layers(config.imagesLocation);
    let meta = {};

    try {

        meta = await repo.getMeta(image);

    } catch (error) {

        res.status(404)
        res.send(`Image "${image}" not found in the repository.`);
        return;

    }

    let parents = await repo.getParents(image);

    for (let i = 0; i < parents.length; i++) {

        let dep = parents[i];
        if (layers.has(dep.name)) continue;

        let meta = await repo.getMeta(dep.name);
        let archive = `/tmp/${meta.data.fileName}`;

        repo.downloadImage(dep.name, archive);
        let layer = layers.create(dep.name, dep.parent);
        await layer.decompress(archive);

    }

    let archive = `/tmp/${meta.data.fileName}`;
    let layer = layers.create(meta.data.name, meta.data.parent);

    repo.downloadImage(meta.data.name, archive);
    await layer.decompress(archive);

    res.send();

});

app.post('/jails/start', async (req, res) => {

    let name = req.body.name;
    let layers = new Layers(config.imagesLocation);
    let layer = {};

    try {

        layer = layers.get(name);

    } catch (error) {

        res.status(404)
        res.send(`Image "${image}" not found.`);
        return;

    }

    let manifestFile = path.join(layer.path, '.manifest');
    let manifest = ManifestFactory.fromFile(manifestFile);

    if (dataJails.has(name)) {

        res.status(409)
        res.send(`Jail "${name}" already exists.`);
        return;

    }

    let log = logsPool.create(name);

    try {

        await log.notice('starting...\n');
        await start(manifest);
        await stop(name);
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

        res.status(404);
        res.send(`Jail "${name}" not found.`);
        return;

    }

    let log = {};

    try {

        log = logsPool.get(name);

    } catch (error) {

        res.status(500)
        res.send(`Log "${name}" not found.`);
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
