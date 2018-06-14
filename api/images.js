'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const Router = require('koa-better-router');
const Layers = require('../libs/layers');
const config = require('../libs/config');
const ManifestFactory = require('../libs/manifest-factory');
const Manifest = require('../libs/manifest');

const routes = Router().loadMethods();

routes.get('/images', async (ctx) => {

    let {
        offset = 0,
        limit = 10,
    } = ctx.request.query;

    let layers = new Layers(config.containersLocation);
    let images = layers.list().slice(offset, limit);

    let countPages = Math.ceil(images.length / limit);

    let nextOffset = offset + limit;
    nextOffset = nextOffset < images.length ? nextOffset : offset;

    let prevOffset = offset - limit;
    prevOffset = prevOffset >= 0 ? prevOffset : 0;

    ctx.body = {
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
    };

});

routes.get('/images/:image', (ctx) => {

    let layers = new Layers(config.containersLocation);

    try {

        let layer = layers.get(ctx.params.image);

        ctx.body = {
            data: {
                name: layer.name,
                parent: layer.parent,
            },
            links: {
                parent: layer.parent ? `/images/${layer.parent}` : null,
            }
        };

    } catch (error) {

        ctx.status = 404;

    }

});

routes.get('/images/:image/manifest', (ctx) => {

    let image = ctx.params.image;
    let layers = new Layers(config.containersLocation);

    if (!layers.has(image)) {

        ctx.status = 404;
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

    ctx.body = manifest;

});

routes.delete('/images/:image', (ctx) => {

    let image = ctx.params.image;
    let layers = new Layers(config.containersLocation);

    if (!layers.has(image)) {

        ctx.status = 404;
        ctx.body = `Image ${image} not found.`;
        return;

    }

    Layers.destroy(image);

});

routes.get('/images/:image/exported', async (ctx) => {

    let image = ctx.params.image;
    let layers = new Layers(config.containersLocation);

    if (!layers.has(image)) {

        ctx.status = 404;
        ctx.body = `Image ${image} not found.`;
        return;

    }

    let layer = layers.get(image);
    let archive = await layer.compress();
    let stream = fs.createReadStream(archive);

    stream.on('close', _ => fse.removeSync(archive));
    stream.on('error', _ => fse.removeSync(archive));

    ctx.set('content-disposition', `attachment; filename="${image}.tar.xz"`);
    ctx.set('content-type', 'application/x-xz');
    ctx.body = stream;

});

module.exports = routes;
