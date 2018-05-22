'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const Router = require('koa-better-router');
const Layers = require('../../libs/layers');
const config = require('../../libs/config');
const ManifestFactory = require('../../libs/manifest-factory');
const Manifest = require('../../libs/manifest');
const datasets = require('../../libs/datasets-db');

const routes = Router().loadMethods();

routes.get('/containers/list/:name/exported', async (ctx) => {

    let name = ctx.params.name;
    let layers = new Layers(config.imagesLocation);

    let dataset = await datasets.findOne({ name: name });

    if (!dataset) {

        ctx.status = 404;
        ctx.body = `Image ${name} not found.`;
        return;

    }

    if (!layers.has(dataset.id)) {

        ctx.status = 500;
        ctx.body = `Data for ${name} not found.`;
        return;

    }

    let layer = layers.get(dataset.id);
    console.log(layer.lastSnapshot);
    console.log(layer.getDiff());
    let stream = await layer.compressStream();

    ctx.set('content-disposition', `attachment; filename="${name}.tar"`);
    ctx.set('content-type', 'application/x-tar');
    ctx.body = stream;

});

module.exports = routes;