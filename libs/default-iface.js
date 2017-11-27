'use strict';

const { spawnSync, spawn } = require('child_process');
const jsonQuery = require('json-query');
const ExecutionError = require('./Errors/execution-error.js');
const Iface = require('../libs/iface.js');
const Ip4Addr = require('../libs/ip4addr.js');

class DefaultIface extends Iface {

    constructor() {

        super();

        this.refresh();

    }

    set(name) {

        spawnSync('route', [
            'delete', 'default'
        ]);

        let result = spawnSync('route', [
            'add', '-iface', name
        ]);

        if (result.status > 0) {

            throw new ExecutionError('Execution command error.');

        }

        this.refresh();

    }

    refresh() {

        this._ipv4Addresses = [];

        this._getIface();
        this._getEther();
        this._getIp4Addresses();

    }

    _getIface() {

        let out = spawnSync('netstat', [
            '-r', '-4', '--libxo', 'json',
        ]).stdout.toString();

        out = JSON.parse(out);
        out = out.statistics['route-information']['route-table']['rt-family'];

        let ethInfo = jsonQuery(
            '[address-family=Internet].rt-entry[destination=default]',
            { data: out }
        ).value;

        this._ethName = ethInfo['interface-name'];

    }

}

let defaultIface = new DefaultIface;

module.exports = defaultIface;
