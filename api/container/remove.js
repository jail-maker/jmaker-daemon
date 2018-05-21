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

routes.delete('/containers/list/:name', async (ctx) => {

    let containerName = ctx.params.name;
    let layers = new Layers(config.imagesLocation);
    let dataset = await datasets.findOne({ name: containerName });

    if (!dataset) {

        ctx.status = 404;
        ctx.body = `Container "${containerName}" not found.`;
        return;

    } else if (!layers.has(dataset.id)) {

        ctx.status = 500;
        ctx.body = `Dataset "${dataset.id}" not found.`;
        return;

    }

    layers.destroy(dataset.id);
    await datasets.remove({ name: containerName }, {});

    ctx.status = 200;
    ctx.body = `Dataset "${dataset.id}" was removed.`;

});

module.exports = routes;
