'use strict';

const Router = require('koa-better-router');

const importer = require('./importer');
const builder = require('./builder');
const started = require('./started');
const container = require('./container');
const list = require('./list');

const routes = Router();

routes.extend(list);
routes.extend(container);
routes.extend(importer);
routes.extend(builder);
routes.extend(started);

module.exports = routes;

