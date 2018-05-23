#!/usr/bin/env node

'use strict';

const http = require('http');
const Koa = require('koa');
const body = require('koa-body');
const Router = require('koa-better-router');
const api = require('./api');
const intProcessEmitter = require('./libs/interrupt-process-emitter');
const dataJails = require('./libs/data-jails');

const config = require('./libs/config');
const stop = require('./actions/stop');

const app = new Koa();
const server = http.createServer(app.callback());

intProcessEmitter.prependListener('int', async _ => {

    try {

        await Promise.all(dataJails.getNames().map(stop));

    } catch (error) {

        console.log(error);

    }

});

app.on('error', (err, ctx) => {

    console.log('server error', err, ctx)

});

app.use(body({ multipart: true }));
app.use(api.middleware());

server.timeout = null;
server.listen(config.port, config.host, () => {

    console.log(`listening on port ${config.port}!`);

});
