'use strict';

const Router = require('koa-better-router');

const exported = require('./exported');
const manifest = require('./manifest');
const runtime = require('./runtime');
const remove = require('./remove');
const info = require('./info');

const routes = Router();

routes.extend(info);
routes.extend(exported);
routes.extend(manifest);
routes.extend(runtime);
routes.extend(remove);

module.exports = routes;
