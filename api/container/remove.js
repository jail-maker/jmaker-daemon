'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const Router = require('koa-better-router');
const ContainerDataset = require('../../libs/layers/container-dataset');
const config = require('../../libs/config');
const ManifestFactory = require('../../libs/manifest-factory');
const Manifest = require('../../libs/manifest');
const datasets = require('../../libs/datasets-db');

const routes = Router().loadMethods();

routes.delete('/containers/list/:name', async (ctx) => {

    let name = ctx.params.name;
    let dataset = await datasets.findOne({ $or: [{name}, {id: name}] });
    let containerPath = path.join(config.containersLocation, dataset.id);

    if (!dataset) {

        ctx.status = 404;
        ctx.body = `Container "${name}" not found.`;
        return;

    } else if (ContainerDataset.existsDataset(containerPath)) {

        let containerDataset = ContainerDataset.getDataset(containerPath);
        containerDataset.destroy();

    }

    await datasets.remove({ id: dataset.id }, {});

    ctx.status = 200;
    ctx.body = `Container "${dataset.id}" was removed.`;

});

module.exports = routes;
