'use strict';

const { spawn } = require('child_process');
const logsPool = require('../libs/logs-pool.js');
const ExecutionError = require('../libs/Errors/execution-error.js');

class Pkg {

    constructor(packages) {

        this._output = null;
        this._packages = packages;
        this._regex = false;
        this._chroot = '/';

    }

    chroot(path) {

        this._chroot = path;
        return this;

    }

    regex(value) {

        this._regex = value;
        return this;

    }

    output(value) {

        this._output = value;
        return this;

    }

    async run() {

        let code = 0;
        let argv = [this._chroot, 'pkg', 'install', '-y'];

        if (this._regex) argv.push('-x');

        let child = spawn('chroot', argv.concat(this._packages), {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        if (this._output !== null) {

            code = (await this._output.fromProcess(child)).code;

        } else {

            code = await new Promise((res, rej) => {

                child.on('exit', (code, signal) => {
                    res(code);
                });

            });

        }

        if (code !== 0)
            throw new ExecutionError('Error execution pkg.');

    }

    async rollback() {}

}

module.exports = Pkg;
