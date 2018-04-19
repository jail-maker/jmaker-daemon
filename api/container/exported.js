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

routes.get('/containers/list/:name/exported', async (ctx) => {

    let image = ctx.params.name;
    let layers = new Layers(config.imagesLocation);

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
