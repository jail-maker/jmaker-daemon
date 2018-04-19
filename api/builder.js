'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const tempWrite = require('temp-write');
const tempfile = require('tempfile');
const tempdir = require('tempdir');
const Router = require('koa-better-router');
const Layers = require('../libs/layers');
const config = require('../libs/config');
const ManifestFactory = require('../libs/manifest-factory');
const Manifest = require('../libs/manifest');

const routes = Router().loadMethods();

routes.post('/containers/new-builder', async (ctx) => {


    let rawBody = ctx.request.rawBody;
    let mimeType = ctx.get('content-type');
    let ext = mime.getExtension(mimeType);

    let context = new Context;
    let tarFile = await tempWrite(rawBody, `jmaker-context-${uniqid()}.${ext}`);
    let tmpDir = await tempdir();
    let manifestFile = path.join(context.path, '.manifest');

    let manifest = {};

    try {

        await decompress(tarFile, context.path, {remove: true});
        manifest = ManifestFactory.fromFile(manifestFile);

    } catch (error) {

        res.status = 400;
        ctx.body = "Bad format.";
        return;

    }


    // ===

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

routes.post('/containers/builder', async (ctx) => {

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

module.exports = routes;
