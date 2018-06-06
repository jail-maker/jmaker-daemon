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

routes.get('/containers/list/:name', async (ctx) => {

    let dataset = await datasets.findOne({ $or: [{name}, {id: name}] });

    if (!datasets) {

        ctx.status = 404;
        ctx.body = `Container "${name}" not found.`;
        return;

    }

    let layers = new Layers(config.imagesLocation);

    try {

        let layer = layers.get(ctx.params.name);

        ctx.status = 200;

        ctx.body = {
            data: {
                id: dataset.id,
                name: layer.name,
                parent: layer.parent,
            },
            links: {
                parent: layer.parent ? `/containers/list/${layer.parent}` : null,
            }
        };

    } catch (error) {

        ctx.status = 404;

    }

});

routes.patch('/containers/list/:name', async (ctx) => {

    let body = ctx.request.body;
    let dataset = await datasets.findOne({ $or: [{name}, {id: name}] });

    if (!dataset) {

        ctx.status = 404;
        return;

    }

    dataset.name = body.name;

    await datasets.update({ $or: [{name}, {id: name}] }, dataset);
    ctx.status = 200;

});

module.exports = routes;
