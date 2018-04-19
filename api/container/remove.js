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

routes.delete('/containers/list/:name', (ctx) => {

    let image = ctx.params.image;
    let layers = new Layers(config.imagesLocation);

    if (!layers.has(image)) {

        ctx.status = 404;
        ctx.body = `Image ${image} not found.`;
        return;

    }

    Layers.destroy(image);

});

module.exports = routes;

