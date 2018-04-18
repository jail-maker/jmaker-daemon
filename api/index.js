'use strict';

const Router = require('koa-better-router');

const images = require('./images');
const jails = require('./jails');
const jails = require('./image-importer');
const jails = require('./image-builder');

const routes = Router();

routes.extend(images);
jails.extend(routes);

module.exports = routes;

