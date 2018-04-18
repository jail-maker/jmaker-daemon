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

const routes = Router().loadMethods();

routes.get('/jails/', async (ctx) => {

    let names = dataJails.getNames().map(name => {

        return {
            name: name,
            ref: `/jails/${name}`,
        };

    });

    ctx.body = names;

});

routes.get('/jails/:name', async (ctx) => {

    let ret = {};

    try {

        let jail = dataJails.get(ctx.params.name);
        ret.name = jail.name;
        ret.working = jail.isWorking();
        ret.info = jail.info;
        Object.assign(ret, jail.configBody);
        delete(ret.fileData);

        ret.links = {
            log: `/jails/${jail.name}/log`,
        };

        ctx.body = ret;

    } catch (error) {

        if (error.name === 'NotFoundError') {

            ctx.status = 404;

        } else {

            ctx.status = 500;

        }

        ctx.body = error.message;

    }

});

routes.post('/jails', async (ctx) => {

    let body = ctx.request.body;
    let name = body.name;
    let layers = new Layers(config.imagesLocation);
    let layer = {};

    try {

        layer = layers.get(name);

    } catch (error) {

        ctx.status = 404;
        ctx.body = `Image "${image}" not found.`;
        return;

    }

    let manifestFile = path.join(layer.path, '.manifest');
    let manifest = ManifestFactory.fromFile(manifestFile);

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

routes.delete('/jails/:name', async (ctx) => {

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
