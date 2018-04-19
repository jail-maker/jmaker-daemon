'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const Router = require('koa-better-router');
const Layers = require('../../libs/layers');
const config = require('../../libs/config');
const ManifestFactory = require('../../libs/manifest-factory');
const Manifest = require('../../libs/manifest');

const routes = Router().loadMethods();

routes.get('/containers/list/:name', (ctx) => {

    let layers = new Layers(config.imagesLocation);

    try {

        let layer = layers.get(ctx.params.name);

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

module.exports = routes;
