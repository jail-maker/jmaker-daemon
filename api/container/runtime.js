'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const Router = require('koa-better-router');
const Layers = require('../../libs/layers');
const config = require('../../libs/config');
const ManifestFactory = require('../../libs/manifest-factory');
const Manifest = require('../../libs/manifest');
const logsPool = require('../../libs/logs-pool');

const start = require('../../actions/start');
const stop = require('../../actions/stop');

const dataJails = require('../../libs/data-jails');

const routes = Router().loadMethods();

routes.get('/containers/list/:name/runtime', async (ctx) => {

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

module.exports = routes;
