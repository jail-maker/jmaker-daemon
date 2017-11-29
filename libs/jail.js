'use strict';

const { spawnSync } = require('child_process');
const EventEmitter = require('events');
const fs = require('fs');

const ConfigFile = require('./config-file.js');

class Jail extends EventEmitter {

    constructor(configBody) {

        super();

        let fileData = configBody.fileData;

        this.name = configBody.jailName;
        this.configFileObj = new ConfigFile(fileData, this.name);
        this.configFilePath = `/tmp/${this.name}-jail.conf`;
        this.configBody = configBody;

        this._working = false;

    }

    stop() {

        this.emit('stopBegin', this);

        let result = spawnSync('jail', [
            '-r', '-f', this.configFilePath, this.name,
        ]);

        console.log(result.output[1].toString());
        console.log(result.output[2].toString());

        fs.unlinkSync(this.configFilePath);

        this._working = false;

        this.emit('stopEnd', this);

    }

    start() {

        this.emit('startBegin', this);

        this.configFileObj.save(this.configFilePath);

        let result = spawnSync('jail', [
            '-c', '-f', this.configFilePath, this.name,
        ]);

        console.log(result.output[1].toString());
        console.log(result.output[2].toString());

        this._working = true;

        this.emit('startEnd', this);

    }

    isWorking() { return this._working; }

}

module.exports = Jail;
