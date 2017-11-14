'use strict';

const jsonQuery = require('json-query');
const uniqid = require('uniqid');
const randomMac = require('random-mac');
const { spawnSync, spawn } = require('child_process');

class IpDHCP {

    constructor() {

        this._eth = this._getEth();

        this._clearEth(this._eth);
        this._createHub(this._eth);

    }

    _getEth() {

        let out = spawnSync('netstat', [
            '-r', '-4', '--libxo', 'json',
        ]).stdout.toString();

        out = JSON.parse(out);
        out = out.statistics['route-information']['route-table']['rt-family'];

        let ethIfo = jsonQuery(
            '[address-family=Internet].rt-entry[destination=default]',
            { data: out }
        ).value;

        console.log(ethIfo);

        eth = ethIfo['interface-name'];

        return eth;

    }

    _createSwitch() {

        let id = uniqid.time();

        spawnSync('ngctl', [
            'mkpeer', 'jmaker-hub:', 'bridge', id, 'link0',
        ]);

        return `jmaker-hub:${id}`;

    }

    _createHub(eth) {

        spawnSync('ngctl', [
            'mkpeer', `${eth}:`, 'hub', 'lower', 'lower',
        ]);

        spawnSync('ngctl', [
            'connect', `${eth}:`, `${eth}:lower`, 'upper', 'upper',
        ]);

        spawnSync('ngctl', [
            'name', `${eth}:lower`, 'jmaker-hub',
        ]);

    }

    _clearEth(eth) {

        spawnSync('ngctl', [
            'msg', `${eth}:`, 'setpromisc', '1',
        ]);

        spawnSync('ngctl', [
            'msg', `${eth}:`, 'setautosrc', '0',
        ]);

        spawnSync('ifconfig', [
            eth, 'delete'
        ]);

    }

}

class Iface {

    constructor() {

        this._name = '';
        this._path = '';
        this._ether = randomMac();

        spawnSync('ngctl', [
            'mkpeer', 'switch:', 'eiface', `link${i}`, 'ether',
        ]);

        let newEthInfo = spawnSync('ngctl', [
            'show', '-n', `switch:link${i}`,
        ]).stdout.toString();

        console.log(newEthInfo);

        let newEth = newEthInfo.match(/Name\:\s*(\w+)\s/);
        newEth = newEth[1];

        spawnSync('ifconfig', [
            newEth, 'ether', randomMac(), 'up',
        ]);

    }

}

class Switch {

    constructor(hubName) {

        this._id = uniqid.time();
        this._hubName = hubName;
        this._ifaces = [];

        spawnSync('ngctl', [
            'mkpeer', `${hubName}:`, 'bridge', this._id, 'link0',
        ]);

    }

    getId() { return this._id; }

    createIface() {

        let iface = new Iface();

    }

}

class Hub {

    constructor(eth, name= 'jmaker-hub') {

        this._eth = eth;
        this._name = name;
        this._switches = {};

        spawnSync('ngctl', [
            'mkpeer', `${eth}:`, 'hub', 'lower', 'lower',
        ]);

        spawnSync('ngctl', [
            'connect', `${eth}:`, `${eth}:lower`, 'upper', 'upper',
        ]);

        spawnSync('ngctl', [
            'name', `${eth}:lower`, 'jmaker-hub',
        ]);

    }

    createSwitch() {

        let sw = new Switch(this._name);
        this._switches[switch.getId()] = sw;

    }

}
