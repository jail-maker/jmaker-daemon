'use strict';

const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const minimist = require('minimist');
const Redis = require('ioredis');

class Config {

    constructor() {

        this.port = 3346;
        this.host = '127.0.0.1';
        this.logLevel = 'info';
        this.jailsDir = path.resolve('./jails');
        this.cacheDir = path.resolve('./cache');
        this.zfs = false;
        this.zfsPool = 'jmaker';

    }

    setPort(value) {

        if (!/^\d+$/.test(value))
            throw new Error('Port is not numeric.');
        this.port = value;

    }

    setJailsDir(value) { this.jailsDir = path.resolve(value); }

    setCacheDir(value) { this.cacheDir = path.resolve(value); }

}

let argv = minimist(process.argv.slice(2));
let fileData = {};
let config = new Proxy(new Config, {

    set(target, prop, value) {

        let letter = prop[0].toUpperCase();
        let newProp = prop.replace(/^./, letter);
        let method = `set${newProp}`;

        if (target[method]) {

            target[method](value);

        } else {

            target[prop] = value;

        }

        return true;

    }

});

if (argv.config) {

    let buffer = fs.readFileSync(path.resolve(argv.config), 'utf8');
    fileData = yaml.load(buffer);

}

Object.assign(config, fileData, argv);
module.exports = config;
