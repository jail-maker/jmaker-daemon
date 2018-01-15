'use strict';

const { spawn, exec } = require('child_process');
const logsPool = require('../libs/logs-pool.js');
const ExecutionError = require('../libs/Errors/execution-error.js');
const zfsLayersPool = require('../libs/zfs-layers-pool.js');
const ExecAbstract = require('../libs/exec-abstract.js');

class JPreStart extends ExecAbstract {

    async run() {

        let commands = this._commands;
        let log = logsPool.get(this._jailName);
        let layers = zfsLayersPool.get(this._jailName);

        for (let i = 0; i != commands.length; i++) {

            let cmdObj = this._normalizeCmd(commands[i]);
            let env = Object.assign({}, this._env, cmdObj.env);

            await layers.create(cmdObj.cmd, async storage => {

                let command = `chroot ${storage.getPath()} ${cmdObj.cmd}`;
                let child = exec(command, {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    env: env,
                    shell: true,
                });

                let { code } = await log.fromProcess(child);

                if (code !== 0) {

                    let msg = `Error execution command: ${command} .`;
                    throw new ExecutionError(msg);

                }

            });

        }

    }

    async rollback() { }

}

module.exports = JPreStart;
