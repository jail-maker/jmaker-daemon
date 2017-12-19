'use strict';

const { spawn } = require('child_process');
const logsPool = require('../libs/logs-pool.js');
const ExecutionError = require('../libs/Errors/execution-error.js');

class JPostStart {

    constructor(jailName, commands) {

        this._jailName = jailName;
        this._commands = commands;

    }

    async run() {

        let commands = this._commands;
        let log = logsPool.get(this._jailName);

        for (let i = 0; i != commands.length; i++) {

            let command = commands[i];
            let child = spawn('/usr/sbin/jexec', [
                this._jailName, ...command.split(' ')
            ], {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let { code } = await log.fromProcess(child);

            if (code !== 0) {

                let msg = `Error execution command: ${command} .`;
                throw new ExecutionError(msg);

            }

        }

    }

    async rollback() { }

}

module.exports = JPostStart;
