'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const Router = require('koa-better-router');
const config = require('../../libs/config');
const ManifestFactory = require('../../libs/manifest-factory');
const Manifest = require('../../libs/manifest');
const logsPool = require('../../libs/logs-pool');

const start = require('../../actions/start');
const stop = require('../../actions/stop');

const jailsPool = require('../../libs/jails/jails-pool');
const datasets = require('../../libs/datasets-db');

const routes = Router().loadMethods();

routes.get('/containers/list/:name/runtime', async (ctx) => {

    let name = ctx.params.name
    let dataset = await datasets.findOne({ $or: [{name}, {id: name}] });
    let containerId = dataset ? dataset.id : null;
    let ret = {};

    try {

        let jail = jailsPool.get(containerId);
        ret.name = jail.name;
        ret.info = jail.info;

        ret.links = { };

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

module.exports = routes;
