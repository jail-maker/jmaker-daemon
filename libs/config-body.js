'use strict';

const ConfigFile = require('./config-file.js');
const config = require('./config.js');

class ConfigBody {

    constructor(data) {

        this.fileData = data;
        this.base = this._extract('base');
        this.jailName = this._extract('name');
        this.dependencies = this._extract('dependencies');
        this.pkg = this._extract('pkg');
        this.rctl = this._extract('rctl');
        this.cpuset = this._extract('cpuset');
        this.mounts = this._extract('mounts');
        this.jPostStart = this._extract('exec.j-poststart');
        this.quota = this._extract('quota');

        this.setPath('');

    }

    setPath(path) {

        this.path = path;
        this.fileData.path = path;
        return this;

    }

    _extract(key) {

        let ret = this.fileData[key];
        delete(this.fileData[key]);
        return ret;

    }

    getConfigJail() {

        return new ConfigFile(this.fileData, this.jailName);

    }

}

module.exports = ConfigBody;
