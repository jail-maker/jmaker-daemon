'use strict';

const { spawn, spawnSync } = require('child_process');

const ExistsError = require('./Errors/exists-error.js');
const CommandError = require('./Errors/command-error.js');
const NotFoundError = require('./Errors/not-found-error.js');

class Zfs {

    constructor(pool) {

        this._checkPool(pool);
        this._pool = pool;

    }

    _checkPool(pool) {

        let result = spawnSync('zpool', [
            'list', '-o', 'name', '-H'
        ]);

        let pools = result.stdout
            .toString()
            .trim()
            .split(/\n/);

        if (pools.indexOf(pool) === -1) {

            let msg = `Pool "${pool}" not found.\n`
            msg += `Available pools: ${pools.join(', ')}`;
            throw new NotFoundError(msg);

        }

    }

    create(name) {

        let result = spawnSync('zfs', [
            'create', `${this._pool}/${name}`
        ]);

        let msg = '';

        switch (result.status) {

            case 1:
                msg = 'Dataset all ready exists.';
                throw new ExistsError(msg);
                break;

            case 2:
                msg = 'Invalid command line options were specified.';
                throw new CommandError(msg);
                break;

        }

    }

    destroy(fs, snap = null) {

        let name = (snap !== null) ? `${fs}@${snap}` : fs;

        let result = spawnSync('zfs', [
            'destroy', '-R', '-f', `${this._pool}/${name}`
        ]);

        return result.status ? false : true;

    }

    snapshot(fs, name) {

        let result = spawnSync('zfs', [
            'snapshot', `${this._pool}/${fs}@${name}`
        ]);

        let msg = '';

        switch (result.status) {

            case 1:
                msg = 'Snapshot all ready exists.';
                throw new ExistsError(msg);
                break;

            case 2:
                msg = 'Invalid command line options were specified.';
                throw new CommandError(msg);
                break;

        }

    }

    clone(fs, snap, newFs) {

        let result = spawnSync('zfs', [
            'clone', `${this._pool}/${fs}@${snap}`, `${this._pool}/${newFs}`
        ]);

        return result.status ? false : true;

    }

    get(name, option) {

        let result = spawnSync('zfs', [
            'get', '-o', 'value', '-H', option, `${this._pool}/${name}`
        ]);

        return result.stdout.toString().trim();

    }

    set(name, option, value) {

        let result = spawnSync('zfs', [
            'set', `${option}=${value}`, `${this._pool}/${name}`
        ]);

        return result.status ? false : true;

    }

    has(name) {

        let result = spawnSync('zfs', [
            'list', '-o', 'name', '-H', `${this._pool}/${name}`
        ]);

        return (result.status === 0) ? true : false;

    }

}

module.exports = Zfs;
