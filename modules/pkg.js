'use strict';

const { spawn } = require('child_process');
const logsPool = require('../libs/logs-pool.js');
const ExecutionError = require('../libs/Errors/execution-error.js');

class Pkg {

    constructor(jailName, packages = []) {

        this._jailName = jailName;
        this._packages = packages;

    }

    async run() {

        let log = logsPool.get(this._jailName);

        let child = spawn('pkg', [
            '-j', this._jailName, 'install', '-y', ...this._packages
        ], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let { code } = await log.fromProcess(child);

        if (code !== 0)
            throw new ExecutionError('Error execution pkg.');

    }

    async rollback() { }

}

module.exports = Pkg;
