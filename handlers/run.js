'use strict';

const { spawn } = require('node-pty');
const { ensureDir } = require('fs-extra');
const path = require('path');
const logsPool = require('../libs/logs-pool.js');
const ExecutionError = require('../libs/errors/execution-error.js');
const ExecAbstract = require('../libs/exec-abstract.js');
const mountDevfs = require('../libs/mount-devfs.js');
const umount = require('../libs/umount.js');
const chains = require('../libs/layers/chains.js');
const Layers = require('../libs/layers/layers.js');
const config = require('../libs/config.js');

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
                name: 'xterm-color',
                env: env,
                cwd: '/',
            }
        );

        let result = await log.fromPty(child);

        if (result.code) {

            console.log(result);

            let msg = `Error execution command: ${command} .`;
            throw new ExecutionError(msg);

        }

    }

    async _doBuilding(data = {}) {

        let {
            index,
            manifest,
            args = '',
            scope,
        } = data;

        let layers = new Layers(config.imagesLocation);
        let layer = layers.get(manifest.name);
        let log = logsPool.get(manifest.name);
        let command = args;

        let env = Object.assign({}, process.env, manifest.env);
        let commitName = `${index} ${command} ${manifest.name}`;

        await layer.commit(commitName, async _ => {

            let mountPath = path.join(layer.path, '/dev');
            await ensureDir(mountPath);

            try {

                mountDevfs(mountPath);
                scope.on('int', _ => umount(mountPath, true));

            } catch (error) {

                log.warn(`devfs not mounted in "${storage.name}".\n`)
                log.warn(`mount path: ${mountPath}.\n`)

            }

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

            try {

                umount(layer.path + '/dev', true);

            } catch (error) { }

            if (code) {

                let msg = `Error execution command: ${command} .`;
                throw new ExecutionError(msg);

            }

        });

    }

}

module.exports = new Run;
