'use strict';

const { spawn } = require('node-pty');
const { ensureDir } = require('fs-extra');
const path = require('path');
const logsPool = require('../libs/logs-pool');
const ExecutionError = require('../libs/errors/execution-error');
const ExecAbstract = require('../libs/exec-abstract');
const mountDevfs = require('../libs/mount-devfs');
const umount = require('../libs/umount');
const chains = require('../libs/layers/chains');
const Layers = require('../libs/layers/layers');
const config = require('../libs/config');
const RuntimeScope = require('../libs/runtime-scope');
const CommandInterface = require('../libs/command-interface');

class RunCommand extends CommandInterface {

    constructor(receiver) {

        super();

        this._receiver = receiver;
        this._commitName = null;

    }

    async exec() {

        let {
            layer,
            index,
            manifest,
            containerId,
            args = '',
        } = this._receiver;

        this._commitName = layer.lastSnapshot;

        let log = logsPool.get(containerId);
        let command = args;

        let env = Object.assign({}, process.env, manifest.env);
        let commitName = `${index} ${command} ${manifest.name}`;

        await layer.commit(commitName, async _ => {

            let child = spawn(
                'chroot',
                [
                    layer.path, "sh", "-c",
                    `cd ${manifest.workdir} && ${command}`,
                ],
                {
                    name: 'xterm-color',
                    env: env,
                    cwd: '/',
                }
            );

            let { code } = await log.fromPty(child);

            if (code) {

                let msg = `Error execution command: ${command} .`;
                throw new ExecutionError(msg);

            }

        });

    }

    async unExec() {

        let {
            layer,
            manifest,
        } = this._receiver;

        if (this._commitName) layer.rollback(this._commitName);

    }

}

module.exports = RunCommand;
