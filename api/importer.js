'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const tempWrite = require('temp-write');
const tempfile = require('tempfile');
const tempdir = require('tempdir');
const Router = require('koa-better-router');
const uuid4 = require('uuid/v4');
const mime = require('mime')
const uniqid = require('uniqid');
const Layers = require('../libs/layers');
const config = require('../libs/config');
const ManifestFactory = require('../libs/manifest-factory');
const Manifest = require('../libs/manifest');
const decompress = require('../libs/decompress');
const datasets = require('../libs/datasets-db');

const routes = Router().loadMethods();

routes.post('/containers/importer', async (ctx) => {

    let rawBody = ctx.request.rawBody;
    let tmpDir = undefined;
    let imageFile = undefined;
    let manifestFile = undefined;
    let layers = new Layers(config.imagesLocation);
    let mimeType = ctx.get('content-type');
    let ext = mime.getExtension(mimeType);

    if (!rawBody.length) {

        ctx.status = 400;
        ctx.body = "Image file not found.";
        return;

    }

    try {

        imageFile = await tempWrite(rawBody, `jmaker-image-${uniqid()}.${ext}`);
        tmpDir = await tempdir();
        manifestFile = path.join(tmpDir, '.manifest');

        let manifest = {};

        try {

            await decompress(imageFile, tmpDir, {files: ['.manifest']});
            manifest = ManifestFactory.fromFile(manifestFile);

        } catch (error) {

            console.log(error);
            ctx.status = 400;
            ctx.body = "Bad image format.";
            return;

        }

        let dataset = await datasets.findOne({ name: manifest.name });
        let parent = await datasets.findOne({ name: manifest.from });
        let parentId = parent ? parent.id : null;

        if (dataset) {

            ctx.status = 409;
            ctx.body = `Image ${manifest.name} already exists.`;
            return;

        }

        if (manifest.from && !parentId) {

            ctx.status = 404;
            ctx.body = `Image ${manifest.from} not found.`;
            return;

        }

        let id = uuid4();
        await datasets.insert({
            id,
            name: manifest.name,
        });

        try {

            let layer = layers.create(id, parentId);
            await layer.decompress(imageFile);

        } catch (error) {

            console.log(error);
            ctx.status = 500;
            return;

        }

    } finally {

        if (imageFile) fse.removeSync(imageFile);
        if (tmpDir) fse.removeSync(tmpDir);

    }

    ctx.status = 200;

});

module.exports = routes;
