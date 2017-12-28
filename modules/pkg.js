'use strict';

const { spawn } = require('child_process');
const logsPool = require('../libs/logs-pool.js');
const ExecutionError = require('../libs/Errors/execution-error.js');

class Pkg {

    constructor(jailName, packages = [], regex = false) {

        this._jailName = jailName;
        this._packages = packages;
        this._regex = regex;

    }

    async run() {

        let log = logsPool.get(this._jailName);
        let argv = ['-j', this._jailName, 'install', '-y'];

        if (this._regex) argv.push('-x');

        let child = spawn('pkg', argv.concat(this._packages), {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let { code } = await log.fromProcess(child);

        if (code !== 0)
            throw new ExecutionError('Error execution pkg.');

    }

    async rollback() {}

}

module.exports = Pkg;
