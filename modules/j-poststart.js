'use strict';

const { spawn, exec } = require('child_process');
const logsPool = require('../libs/logs-pool.js');
const ExecutionError = require('../libs/Errors/execution-error.js');
const ExecAbstract = require('../libs/exec-abstract.js');

class JPostStart extends ExecAbstract {

    async run() {

        let commands = this._commands;
        let log = logsPool.get(this._jailName);

        for (let i = 0; i != commands.length; i++) {

            let cmdObj = this._normalizeCmd(commands[i]);
            let env = Object.assign({}, this._env, cmdObj.env);

            let command = `/usr/sbin/jexec ${this._jailName} ${cmdObj.cmd}`;
            let child = spawn('/usr/sbin/jexec', [this._jailName, `sh -c "${cmdObj.cmd}"`], {
                stdio: ['ignore', 'pipe', 'pipe'],
                env: env,
                shell: true,
                cwd: '/',
            });

            let result = await log.fromProcess(child);

            if (result.code) {

                console.log(result);

                let msg = `Error execution command: ${command} .`;
                throw new ExecutionError(msg);

            }

        }

    }

    async rollback() { }

}

module.exports = JPostStart;
