'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const tempWrite = require('temp-write');
const tempfile = require('tempfile');
const tempdir = require('tempdir');
const getRawBody = require('raw-body');
const Router = require('koa-better-router');
const uuid4 = require('uuid/v4');
const mime = require('mime');
const uniqid = require('uniqid');
const Dataset = require('../libs/layers/dataset');
const ContainerDataset = require('../libs/layers/containers-dataset');
const config = require('../libs/config');
const ManifestFactory = require('../libs/manifest-factory');
const Manifest = require('../libs/manifest');
const decompress = require('../libs/decompress');
const datasets = require('../libs/datasets-db');

const routes = Router().loadMethods();

routes.post('/containers/importer', async (ctx) => {

    let rawBody = await getRawBody(ctx.req, { limit: '800mb' });
    let tmpDir = undefined;
    let imageFile = undefined;
    let manifestFile = undefined;
    let mimeType = ctx.get('content-type');
    let ext = mime.getExtension(mimeType);
    let imageName = `${uuid4()}.${ext}`;

    if (!rawBody.length) {

        ctx.status = 400;
        ctx.body = "Image file not found.";
        return;

    }

    try {

        imageFile = await tempWrite(rawBody, imageName);
        tmpDir = await tempdir();
        manifestFile = path.join(tmpDir, '.manifest');

        let manifest = {};

        try {

            await decompress(imageFile, tmpDir, {files: ['.manifest']});
            manifest = ManifestFactory.fromFile(manifestFile);

        } catch (error) {

            console.log(error);
            ctx.status = 400;
            ctx.body = "Bad image file format.";
            return;

        }

        let parent = await datasets.findOne({ name: manifest.from });
        let parentId = parent ? parent.id : null;

        if (manifest.from && !parentId) {

            ctx.status = 404;
            ctx.body = `Image ${manifest.from} not found.`;
            return;

        }

        let id = uuid4();
        await datasets.insert({
            id,
            name: id,
            parentId,
            imageName,
        });

        let containerPath = path.join(config.containersLocation, id);
        let containerDataset = null;

        try {

            if (parentId) {

                let parentPath = path.join(config.containersLocation, parentId);
                let parentDataset = ContainerDataset.getDataset(parentPath);
                containerDataset = parentDataset.fork(containerPath);

            } else {

                containerDataset = ContainerDataset.create(containerPath);

            }

            await containerDataset.decompress(imageFile);

        } catch (error) {

            if (imageFile) fse.removeSync(imageFile);

            console.log(error);
            ctx.status = 500;
            return;

        }

        {

            let imagesDataset = Dataset.createIfNotExists(config.imagesLocation);
            let file = path.join(imagesDataset.path, imageName);
            await fse.move(imageFile, file);

        }

    } finally {

        if (tmpDir) fse.removeSync(tmpDir);

    }

    ctx.status = 200;

});

module.exports = routes;
