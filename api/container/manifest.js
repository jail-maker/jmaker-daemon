'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const Router = require('koa-better-router');
const ContainerDataset = require('../../libs/layers/container-dataset');
const config = require('../../libs/config');
const ManifestFactory = require('../../libs/manifest-factory');
const Manifest = require('../../libs/manifest');

const routes = Router().loadMethods();

routes.get('/containers/list/:name/manifest', (ctx) => {

    let name = ctx.params.name;

    let containerPath = path.join(config.containersLocation, name);
    if (!ContainerDataset.existsDataset(name)) {

        ctx.status = 404;
        return;

    }

    let containerDataset = ContainerDataset.getDataset(containerPath);
    let manifestFile = path.join(containerDataset.path, '.manifest');

    try {

        let manifest = ManifestFactory.fromFile(manifestFile);
        ctx.status = 200;
        ctx.body = manifest;

    } catch (error) {

        ctx.status = 500;
        ctx.body = 'Error reading manifest file';
        return;

    }

});

module.exports = routes;
