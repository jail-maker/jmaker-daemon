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
            let env = Object.assign({}, process.env, this._env, cmdObj.env);
            let layerName = `${cmdObj.toString()} ${this._jailName}`;

            await layers.create(layerName, async storage => {

                let child = spawn('chroot', [storage.getPath(), `sh -c "${cmdObj.cmd}"`], {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    env: env,
                    shell: true,
                    cwd: '/',
                });

                let { code } = await log.fromProcess(child);

                if (code !== 0) {

                    let msg = `Error execution command: ${cmdObj.cmd} .`;
                    throw new ExecutionError(msg);

                }

            });

        }

    }

    async rollback() { }

}

module.exports = JPreStart;
