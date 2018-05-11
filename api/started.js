'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const Router = require('koa-better-router');
const Layers = require('../libs/layers');
const config = require('../libs/config');
const ManifestFactory = require('../libs/manifest-factory');
const Manifest = require('../libs/manifest');
const logsPool = require('../libs/logs-pool');

const start = require('../actions/start');
const stop = require('../actions/stop');

const dataJails = require('../libs/data-jails');
const datasets = require('../libs/datasets-db');

const routes = Router().loadMethods();

routes.post('/containers/started', async (ctx) => {

    console.log('/containers/started');

    let body = ctx.request.body;
    let name = body.name;
    let dataset = await datasets.findOne({ $or: [{name}, {id: name}] });

    if (!datasets) {

        ctx.status = 404;
        ctx.body = `Container "${name}" not found.`;
        return;

    }

    let layers = new Layers(config.imagesLocation);
    let layer = {};

    try {

        layer = layers.get(dataset.id);

    } catch (error) {

        ctx.status = 500;
        ctx.body = `Files/dataset for container "${name}" not found.`;
        return;

    }

    let manifestFile = path.join(layer.path, '.manifest');
    let manifest = ManifestFactory.fromFile(manifestFile);

    console.log('manifest:');
    console.dir(manifest);

    if (dataJails.has(name)) {

        ctx.status = 409;
        ctx.body = `Jail "${name}" already exists.`;
        return;

    }

    let log = logsPool.create(name);

    try {

        await log.notice('starting...\n');
        await start(manifest);
        await stop(name);
        await log.notice('finish.\n', true);

    } catch (error) {

        await log.crit(`\n${error.toString()}\n`, true);
        logsPool.delete(name);
        console.log(error);

    }


});

routes.delete('/containers/started/:name', async (ctx) => {

    let name = ctx.params.name;

    if (!dataJails.has(name)) {

        ctx.status = 404;
        ctx.body = `Jail "${name}" not found.`;
        return;

    }

    let log = {};

    try {

        log = logsPool.get(name);

    } catch (error) {

        ctx.status = 500;
        ctx.body = `Log "${name}" not found.`;
        return;

    }

    try {

        await log.notice('stopping...\n');
        await stop(name);
        await log.notice('finish\n', true);

        logsPool.delete(name);

    } catch (error) {

        await log.crit(`\n${error.toString()}\n`, true);
        console.log(error);

    }

});

module.exports = routes;
