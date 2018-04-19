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

routes.get('/containers/list/:name/manifest', (ctx) => {

    let image = ctx.params.name;
    let layers = new Layers(config.imagesLocation);

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

module.exports = routes;
