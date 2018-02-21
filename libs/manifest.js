'use strict';

const fs = require('fs');

class Manifest {

    constructor() {

        this.name = '';
        this.from = null;
        this.workdir = '/';
        this.rules = {};
        this.pkg = {};
        this.rctl = {};
        this.dependencies = [];
        this.cpus = '';
        this.cpuset = '';
        this.mounts = [];
        this['exec.j-prestart'] = [];
        this['exec.j-poststart'] = [];
        this.quota = '';
        this.copy = [];
        this.env = {};
        this['resolv-sync'] = true;

    }

    toFile(file) {

        fs.writeFileSync(file, JSON.stringify(this));

    }

}

module.exports = Manifest;
