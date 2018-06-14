'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const Router = require('koa-better-router');
const Layers = require('../libs/layers');
const config = require('../libs/config');
const ManifestFactory = require('../libs/manifest-factory');
const Manifest = require('../libs/manifest');
const datasets = require('../libs/datasets-db');

const routes = Router().loadMethods();

routes.get('/containers/list', async (ctx) => {

    let {
        offset = 0,
        limit = 10,
    } = ctx.request.query;

    let containers = (await datasets.find({}));
    let containersCount = containers.length;
    containers = containers.slice(offset, limit);

    let countPages = Math.ceil(containers.length / limit);

    let nextOffset = offset + limit;
    nextOffset = nextOffset < containers.length ? nextOffset : offset;

    let prevOffset = offset - limit;
    prevOffset = prevOffset >= 0 ? prevOffset : 0;

    ctx.body = {
        items: containers.map(container => {
            return {
                id: container.id,
                name: container.name,
                parentId: container.parentId,
                links: {
                    self: `/containers/list/${container.name}`,
                },
            };
        }),
        countAllItems: containersCount,
        countOnPage: limit,
        countPages: countPages,
        links: {
            next: `/containers/list/?offset=${nextOffset}&limit=${limit}`,
            prev: `/containers/list/?offset=${prevOffset}&limit=${limit}`,
        },
    };

});

module.exports = routes;
