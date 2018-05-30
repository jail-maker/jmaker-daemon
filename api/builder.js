'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const tempWrite = require('temp-write');
const tempfile = require('tempfile');
const tempdir = require('tempdir');
const Router = require('koa-better-router');
const getRawBody = require('raw-body');
const config = require('../libs/config');
const ManifestFactory = require('../libs/manifest-factory');
const Manifest = require('../libs/manifest');
const mime = require('mime');
const Context = require('../libs/context');
const decompress = require('../libs/decompress');
const create = require('../actions/create');
const uniqid = require('uniqid');

const routes = Router().loadMethods();

routes.post('/containers/builder', async (ctx, next) => {

    let rawBody = await getRawBody(ctx.req, { limit: '800mb' });
    let mimeType = ctx.get('content-type');
    let ext = mime.getExtension(mimeType);

    console.log(mimeType);

    let context = new Context;
    let tarFile = await tempWrite(rawBody, `jmaker-context-${uniqid()}.${ext}`);
    let manifestFile = path.join(context.path, '.manifest');

    let manifest = {};

    try {

        await decompress(tarFile, context.path, {remove: true});
        manifest = ManifestFactory.fromFile(manifestFile);

    } catch (error) {

        console.log(error);
        ctx.status = 400;
        ctx.body = "Bad container file format.";
        return;

    }

    let name = manifest.name;
    console.dir('manifest:', manifest);

    try {

        await create(manifest, context);

    } catch (error) {

        console.log(error);

    } finally {

        context.destroy();

    }

    ctx.status = 200;

});

module.exports = routes;
