'use strict';

let Db = require('nedb');
let DbPromise = require('nedb-promise');
let path = require('path');
let config = require('./config.js');

let db = new Db({
    filename: path.resolve(config.dbFile),
    autoload: true,
});

db.persistence.compactDatafile();

module.exports = DbPromise.fromInstance(db);
