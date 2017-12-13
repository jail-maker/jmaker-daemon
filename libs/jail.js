'use strict';

const { spawnSync, spawn } = require('child_process');
const EventEmitter = require('events');
const fs = require('fs');

const ConfigFile = require('./config-file.js');
const logsPool = require('./logs-pool.js');

class Jail extends EventEmitter {

    constructor(configBody) {

        super();

        let fileData = configBody.fileData;

        this.name = configBody.jailName;
        this.configFileObj = new ConfigFile(fileData, this.name);
        this.configFilePath = `/tmp/${this.name}-jail.conf`;
        this.configBody = configBody;
        this.info = {};

        this._working = false;

    }

    async stop() {

        this.emit('stopBegin', this);

        let log = logsPool.get(this.name);
        let child = spawn('jail', [
            '-r', '-f', this.configFilePath, this.name,
        ], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        await log.fromProcess(child);

        fs.unlinkSync(this.configFilePath);

        this._working = false;

        this.emit('stopEnd', this);

    }

    async start() {

        this.emit('startBegin', this);
        this.configFileObj.save(this.configFilePath);

        let log = logsPool.get(this.name);
        let child = spawn('jail', [
            '-c', '-f', this.configFilePath, this.name,
        ], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        await log.fromProcess(child);

        this._loadInfo();

        this._working = true;

        this.emit('startEnd', this);

    }

    _loadInfo() {

        let result = spawnSync('jls', [
            '-j', this.name, '-n', '--libxo=json',
        ]);

        let jsonData = JSON.parse(result.output[1].toString());

        this.info = jsonData['jail-information'].jail[0];

    }

    isWorking() { return this._working; }

}

module.exports = Jail;
