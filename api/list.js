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

routes.get('/containers/list', async (ctx) => {

    let {
        offset = 0,
        limit = 10,
    } = ctx.request.query;

    let layers = new Layers(config.imagesLocation);
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

module.exports = routes;
