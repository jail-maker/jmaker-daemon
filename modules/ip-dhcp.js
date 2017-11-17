'use strict';

const jsonQuery = require('json-query');
const uniqid = require('uniqid');
const randomMac = require('random-mac');
const { spawnSync, spawn } = require('child_process');
const defaultIface = require('../libs/default-iface.js');

class IpDHCP {

    constructor() {

        this._enabled = false;
        this._eth = defaultIface.eth;
        this._hub = {};
        this._ngIface = {};

    }

    enable() {

        defaultIface.refresh();
        this._clearEth(defaultIface);
        this._hub = new NgHub(this._eth);

        let iface = this.getIface();

        defaultIface.ipv4Address.forEach(ip => {

            iface.setAlias(ip);
            defaultIface.rmAliasIp4(ip);

        });

        iface.execDhcp();
        defaultIface.refresh();

        this._ngIface = iface;
        this._enabled = true;

    }

    getIface() {

        let hub = this._hub;
        let sw = hub.getAvilableSwitch();
        return sw.createIface();

    }

    isEnabled() { return this._enabled; }

    _clearEth(iface) {

        spawnSync('ngctl', [
            'msg', `${iface.eth}:`, 'setpromisc', '1',
        ]);

        spawnSync('ngctl', [
            'msg', `${iface.eth}:`, 'setautosrc', '0',
        ]);

        iface.rmAliasIp4(iface.ipv4Address[0]);

    }

}

class NgIface {

    constructor(switchPath, switchHook) {

        this._switchPath = switchPath;
        this._switchHook = switchHook;
        this._path = `${switchPath}.${switchHook}`;
        this._ether = randomMac();
        this._ethName = '';
        this._ip4 = [];

        spawnSync('ngctl', [
            'mkpeer', switchPath, 'eiface', switchHook, 'ether',
        ]);

        console.log(this._path);

        let ethInfo = spawnSync('ngctl', [
            'show', '-n', this._path,
        ]).stdout.toString();

        console.log(ethInfo);

        let ethName = ethInfo.match(/Name\:\s*(\w+)\s/);
        ethName = ethName[1];
        this._ethName = ethName;

        spawnSync('ifconfig', [
            ethName, 'ether', randomMac(), 'up',
        ]);

    }

    getEthName() { return this._ethName; }

    getIp4Addr() { return this._ip4; }

    setAlias(alias) {

        spawnSync('ifconfig', [
            this._ethName, 'alias', alias,
        ]);

    }

    execDhcp() {

        let eth = this._ethName;

        spawnSync('dhclient', [
            eth,
        ]);

        let ethInfo = spawnSync('netstat', [
            '-4', '-I', eth, '-n' ,'--libxo=json',
        ]).stdout.toString();

        ethInfo = JSON.parse(ethInfo);

        console.log(ethInfo);

        let result = jsonQuery(
            `[**]interface[*name=${eth}].address`,
            { data: ethInfo }
        ).value;

        console.log(result);
        this._ip4 = result;

    }

}

class NgSwitch {

    constructor(hubName, hubHook) {

        this._hubName = hubName;
        this._hubHook = hubHook;
        this._path = `${hubName}:${hubHook}`
        this._ifaces = [];
        this._countPorts = 32;

        spawnSync('ngctl', [
            'mkpeer', `${hubName}:`, 'bridge', hubHook, 'link0',
        ]);

        this._ifaces.length = this._countPorts;
        this._ifaces.fill(null, 0, this._countPorts);
        this._ifaces[0] = hubName;

    }

    createIface() {

        let key = this._ifaces.indexOf(null);
        let hook = `link${key}`;
        let iface = new NgIface(this._path, hook);
        this._ifaces[key] = iface;

        return iface;

    }

    isFilled() {

        let result = this._ifaces.indexOf(null);

        return result === -1 ? true : false;

    }

}

class NgHub {

    constructor(eth, name = 'jmaker-hub') {

        this._eth = eth;
        this._name = name;
        this._switches = [];

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

        let hook = uniqid.time();
        let sw = new NgSwitch(this._name, hook);
        this._switches.push(sw);

        return sw;

    }

    getSwitches() { return this._switches; }

    getAvilableSwitch() {

        let sws = this._switches;

        if (!sws.length) return this.createSwitch(); 

        let sw = sws.find(sw => sw.isFilled() ? false : true );

        return sw ? sw : this.createSwitch();

    }

}

module.exports = IpDHCP;
