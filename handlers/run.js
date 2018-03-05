'use strict';

const { spawn, exec } = require('child_process');
const path = require('path');
const logsPool = require('../libs/logs-pool.js');
const ExecutionError = require('../libs/Errors/execution-error.js');
const ExecAbstract = require('../libs/exec-abstract.js');
const mountDevfs = require('../libs/mount-devfs.js');
const umount = require('../libs/umount.js');
const chains = require('../libs/layers/chains.js');

class Run {

    constructor() {

        this.name = 'run';

    }

    async do(data = {}) {

        let {
            manifest,
            args = '',
            stage,
        } = data;

        switch (stage) {

            case 'building':
                await this._doBuilding(data);
                break;

            case 'starting':
                await this._doStarting(data);
                break;

            default:
                throw new Error('Unknown stage.');
                break;

        }

    }

    async _doStarting(data = {}) {

        let {
            manifest,
            args = '',
        } = data;

        let log = logsPool.get(manifest.name);
        let env = Object.assign({}, process.env, manifest.env);
        let command = args;

        let child = spawn(
            '/usr/sbin/jexec',
            [
                manifest.name, "sh", "-c",
                `cd ${manifest.workdir} && ${command}`
            ],
            {
                stdio: ['ignore', 'pipe', 'pipe'],
                env: env,
                cwd: '/',
            }
        );

        let result = await log.fromProcess(child);

        if (result.code) {

            console.log(result);

            let msg = `Error execution command: ${command} .`;
            throw new ExecutionError(msg);

        }

    }

    async _doBuilding(data = {}) {

        let {
            manifest,
            args = '',
        } = data;

        let log = logsPool.get(manifest.name);
        let chain = chains.get(manifest.name);
        let command = args;

        let env = Object.assign({}, process.env, manifest.env);
        let layerName = `${command} ${manifest.name}`;

        await chain.layer(layerName, async storage => {

            try {

                mountDevfs(path.join(storage.path, '/dev'));

            } catch (error) {

                log.warn(`devfs not mounted in "${storage.name}".\n`)

            }

            let child = spawn(
                'chroot',
                [
                    storage.path, "sh", "-c",
                    `cd ${manifest.workdir} && ${command}`,
                ],
                {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    env: env,
                    cwd: '/',
                }
            );

            let { code } = await log.fromProcess(child);

            try {

                umount(storage.path + '/dev', true);

            } catch (error) { }

            if (code) {

                let msg = `Error execution command: ${command} .`;
                throw new ExecutionError(msg);

            }

        });

    }

}

module.exports = new Run;
