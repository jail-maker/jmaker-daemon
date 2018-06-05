'use strict';

const { spawnSync, spawn } = require('child_process');
const EventEmitter = require('events');
const fs = require('fs');

const ExecutionError = require('../errors/execution-error');

const ConfigFile = require('./config-file');
const logsPool = require('../logs-pool');
const datasets = require('../datasets-db');

class Jail extends EventEmitter {

    constructor({manifest, path, containerId}) {

        super();

        let rules = Object.assign({}, manifest.rules);
        rules.path = path;

        // this.name = manifest.name;
        this.name = containerId;
        this.containerId = containerId;
        this.configFileObj = new ConfigFile(this.name, rules);
        this.configFilePath = `/tmp/${this.containerId}-jail.conf`;
        this.manifest = manifest;

    }

    async start() {

        this.emit('beforeStart', this);
        this.configFileObj.save(this.configFilePath);

        let log = logsPool.get(this.containerId);
        let child = spawn('jail', [
            '-c', '-f', this.configFilePath, this.name,
        ], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let { code } = await log.fromProcess(child);
        let msg = 'Error execution jail.';
        if (code !== 0) throw new ExecutionError(msg);

        this.emit('afterStart', this);

    }

    async stop() {

        this.emit('beforeStop', this);

        let log = logsPool.get(this.containerId);
        let child = spawn('jail', [
            '-r', '-f', this.configFilePath, this.name,
        ], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        this.emit('stop', this);

        await log.fromProcess(child);

        fs.unlinkSync(this.configFilePath);

        this.emit('afterStop', this);

    }

    get info() {

        try {

            let result = spawnSync('jls', [
                '-j', this.name, '-n', '--libxo=json',
            ]);

            let jsonData = JSON.parse(result.output[1].toString());
            return jsonData['jail-information'].jail[0];

        } catch (error) {

            return {};

        }

    }

}

module.exports = Jail;
