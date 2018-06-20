'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const mime = require('mime');
const Router = require('koa-better-router');
const config = require('../../libs/config');
const ManifestFactory = require('../../libs/manifest-factory');
const Manifest = require('../../libs/manifest');
const datasets = require('../../libs/datasets-db');
const PassThrough = require('stream').PassThrough;

const routes = Router().loadMethods();

routes.get('/containers/list/:name/exported', async (ctx) => {

    let name = ctx.params.name;
    let dataset = await datasets.findOne({ $or: [{name}, {id: name}] });

    if (!dataset) {

        ctx.status = 404;
        ctx.body = `Image ${name} not found.`;
        return;

    }

    let imagesDataset = Dataset.getDataset(config.imagesLocation);
    let file = path.join(imagesDataset.path, dataset.imageName);
    let stream = fs.createReadStream(file);

    ctx.set('content-disposition', `attachment; filename="${dataset.imageName}"`);
    ctx.set('content-type', mime.getType(file));

    // See: https://github.com/koajs/koa/pull/612 for more information.
    ctx.body = stream.on('error', ctx.onerror).pipe(PassThrough());

});

module.exports = routes;
