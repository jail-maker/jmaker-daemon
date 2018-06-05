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

const jailsPool = require('../libs/jails/jails-pool');
const datasets = require('../libs/datasets-db');

const routes = Router().loadMethods();

routes.post('/containers/started', async (ctx, next) => {

    let body = ctx.request.body;
    let name = body.name;
    let layers = new Layers(config.imagesLocation);
    let dataset = await datasets.findOne({ $or: [{name}, {id: name}] });
    let containerId = dataset ? dataset.id : null;
    let started = jailsPool.has(containerId);

    // if started

    if (started) {

        ctx.status = 409;
        ctx.body = `Jail "${name}" already exists.`;
        return;

    }

    // if database record not exists

    if (!dataset || !layers.has(containerId)) {

        ctx.status = 404;
        ctx.body = `Container "${name}" not found.`;
        return;

    }

    setImmediate(_ => next());

    ctx.status = 200;
    ctx.body = { };

}, async (ctx) => {

    let body = ctx.request.body;
    let name = body.name;
    let rules = body.rules;
    let dataset = await datasets.findOne({ $or: [{name}, {id: name}] });
    let containerId = dataset ? dataset.id : null;
    let containerName = dataset ? dataset.name : null;

    let layers = new Layers(config.imagesLocation);
    let layer = layers.get(containerId);

    let manifestFile = path.join(layer.path, '.manifest');
    let manifest = ManifestFactory.fromFile(manifestFile);

    Object.assign(manifest.rules, rules);

    let log = logsPool.create(containerId);

    try {

        await log.notice('starting...\n');
        await start(containerId, manifest);

    } catch (error) {

        await log.crit(`\n${error.toString()}\n`, true);
        console.log(error);

    } finally {

        await stop(containerId);
        await log.notice('finish.\n', true);
        logsPool.delete(containerId);

    }

});

routes.delete('/containers/started/:name', async (ctx, next) => {

    let name = ctx.params.name;
    let dataset = await datasets.findOne({ $or: [{name}, {id: name}] });
    let containerId = dataset ? dataset.id : null;
    let started = jailsPool.has(containerId);

    if (!started) {

        ctx.status = 404;
        ctx.body = `Jail "${name}" not runing.`;
        return;

    }

    setImmediate(_ => next());

    ctx.status = 200;
    ctx.body = {};

}, async (ctx) => {

    let name = ctx.params.name;
    let dataset = await datasets.findOne({ $or: [{name}, {id: name}] });
    let containerId = dataset ? dataset.id : null;
    let log = logsPool.get(containerId);

    try {

        await log.notice('stopping...\n');
        await stop(containerId);
        await log.notice('finish\n', true);

        logsPool.delete(containerId);

    } catch (error) {

        ctx.status = 500;
        await log.crit(`\n${error.toString()}\n`, true);
        console.log(error);

    }

});

module.exports = routes;
