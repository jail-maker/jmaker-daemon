'use strict';

const { spawn, exec } = require('child_process');
const logsPool = require('../libs/logs-pool.js');
const ExecutionError = require('../libs/Errors/execution-error.js');

class JPostStart {

    constructor(jailName, commands = [], env = {}) {

        if (!Array.prototype.isPrototypeOf(commands))
            commands = [commands];

        this._jailName = jailName;
        this._commands = commands;
        this._env = env;

    }

    async run() {

        let commands = this._commands;
        let log = logsPool.get(this._jailName);

        for (let i = 0; i != commands.length; i++) {

            let command = `/usr/sbin/jexec ${this._jailName} ${commands[i]}`;
            let child = exec(command, {
                stdio: ['ignore', 'pipe', 'pipe'],
                env: this._env,
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
