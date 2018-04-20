'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const tempWrite = require('temp-write');
const tempfile = require('tempfile');
const tempdir = require('tempdir');
const Router = require('koa-better-router');
const config = require('../libs/config');
const ManifestFactory = require('../libs/manifest-factory');
const Manifest = require('../libs/manifest');
const mime = require('mime');
const Context = require('../libs/context');
const decompress = require('../libs/decompress');
const logsPool = require('../libs/logs-pool');
const create = require('../actions/create');
const uniqid = require('uniqid');

const routes = Router().loadMethods();

routes.post('/containers/new-builder', async (ctx, next) => {

    let rawBody = ctx.request.rawBody;
    let mimeType = ctx.get('content-type');
    let ext = mime.getExtension(mimeType);

    let context = new Context;
    let tarFile = await tempWrite(rawBody, `jmaker-context-${uniqid()}.${ext}`);
    let manifestFile = path.join(context.path, '.manifest');

    let manifest = {};

    try {

        await decompress(tarFile, context.path, {remove: true});
        manifest = ManifestFactory.fromFile(manifestFile);

    } catch (error) {

        ctx.status = 400;
        ctx.body = "Bad format.";
        return;

    }

    let name = manifest.name;
    let log = logsPool.create(name);

    try {

        await log.notice('create...\n');
        await create(manifest, context);
        await log.notice('finish.\n', true);

    } catch (e) {

        await log.crit(`\n${e.toString()}\n`, true);
        console.log(e);

    } finally {

        logsPool.delete(name);
        context.destroy();

    }

    ctx.status = 200;

});

module.exports = routes;
