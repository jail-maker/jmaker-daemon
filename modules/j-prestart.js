'use strict';

const { spawn, exec } = require('child_process');
const logsPool = require('../libs/logs-pool.js');
const ExecutionError = require('../libs/Errors/execution-error.js');
const ExecAbstract = require('../libs/exec-abstract.js');
const mountDevfs = require('../libs/mount-devfs.js');
const umount = require('../libs/umount.js');

const chains = require('../libs/layers/chains.js');

class JPreStart extends ExecAbstract {

    async run() {

        let commands = this._commands;
        let log = logsPool.get(this._jailName);
        let chain = chains.get(this._jailName);

        for (let i = 0; i != commands.length; i++) {

            let cmdObj = this._normalizeCmd(commands[i]);
            let env = Object.assign({}, process.env, this._env, cmdObj.env);
            let layerName = `${cmdObj.toString()} ${this._jailName}`;

            await chain.layer(layerName, async storage => {

                mountDevfs(storage.getPath() + '/dev');

                let child = spawn(
                    'chroot', [storage.getPath(), "sh", "-c", `${cmdObj.cmd}`], 
                    {
                        stdio: ['ignore', 'pipe', 'pipe'],
                        env: env,
                        cwd: '/',
                    }
                );

                let { code } = await log.fromProcess(child);

                umount(storage.getPath() + '/dev', true);

                if (code) {

                    let msg = `Error execution command: ${cmdObj.cmd} .`;
                    throw new ExecutionError(msg);

                }

            });

        }

    }

    async rollback() { }

}

module.exports = JPreStart;
