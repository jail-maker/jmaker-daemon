'use strict';

const { spawn, exec } = require('child_process');
const logsPool = require('../libs/logs-pool.js');
const ExecutionError = require('../libs/Errors/execution-error.js');
const zfsLayersPool = require('../libs/zfs-layers-pool.js');

class JPreStart {

    constructor(jailName, commands = []) {

        if (!Array.prototype.isPrototypeOf(commands))
            commands = [commands];

        this._jailName = jailName;
        this._commands = commands;

    }

    async run() {

        let commands = this._commands;
        let log = logsPool.get(this._jailName);
        let layers = zfsLayersPool.get(this._jailName);

        for (let i = 0; i != commands.length; i++) {

            await layers.create(commands[i], async storage => {

                let command = `chroot ${storage.getPath()} ${commands[i]}`;
                let child = exec(command, {
                    stdio: ['ignore', 'pipe', 'pipe']
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
