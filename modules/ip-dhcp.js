'use strict';

const { spawnSync, spawn } = require('child_process');
const jsonQuery = require('json-query');
const uniqid = require('uniqid');
const randomMac = require('random-mac');
const defaultIface = require('../libs/default-iface.js');
const dataJails = require('../libs/data-jails.js');
const Iface = require('../libs/iface.js');
const Ip4Addr = require('../libs/ip4addr.js');

class IpDHCP {

    constructor() {

        this._enabled = false;
        this._eth = defaultIface.getEthName();
        this._hub = {};
        this._ngIface = {};

    }

    enable() {

        defaultIface.refresh();
        this._clearEth(defaultIface);
        this._hub = new NgHub(this._eth);

        let iface = this.getIface();

        defaultIface.getIp4Addresses().forEach(ip => {

            iface.addIp4Address(ip);
            defaultIface.rmIp4Address(ip);

        });

        iface.execDhcp();
        defaultIface.refresh();

        this._ngIface = iface;
        this._enabled = true;

    }

    disable() {

        let iface = this._ngIface;
        defaultIface.refresh();
        defaultIface.set(this._eth);

        iface.getIp4Addresses().forEach(ip => {

            defaultIface.addIp4Address(ip);
            iface.rmIp4Address(ip);

        });

        this._hub.destroy();
        this._enabled = false;

    }

    getIface() {

        let hub = this._hub;
        let sw = hub.getAvilableSwitch();
        return sw.createIface();

    }

    isEnabled() { return this._enabled; }

    pipeRule(rules) {

        let ipsRule = rules['ip4.addr'];

        if (ipsRule.data === 'DHCP') {

            if (!this.isEnabled()) this.enable();

            let iface = this.getIface();
            iface.execDhcp();

            let eth = iface.getEthName();
            let ip4 = iface.getIp4Addr()[0];

            ipsRule.view = `ip4.addr = "${eth}|${ip4}/24";`;

        }

        return rules;

    }

    getPipeRule(dataCell) {

        return (rules) => {

            let ipsRule = rules['ip4.addr'];

            if (ipsRule.data === 'DHCP') {

                if (!this.isEnabled()) this.enable();

                let iface = this.getIface();
                dataCell.ngIface = iface;
                iface.execDhcp();

                let eth = iface.getEthName();
                let ip4 = iface.getIp4Addr()[0];

                ipsRule.view = `ip4.addr = "${eth}|${ip4}/24";`;

            }

            return rules;

        }

    }

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

class NgIface extends Iface {

    constructor(ngSwitch, switchHook) {

        super();

        let switchPath = ngSwitch.getPath();

        this._switch = ngSwitch;
        this._switchPath = switchPath;
        this._switchHook = switchHook;
        this._path = `${switchPath}.${switchHook}`;
        this._ether = randomMac();
        this._ethName = '';

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
            ethName, 'ether', this._ether, 'up',
        ]);

    }

    destroy() {

        spawnSync('ngctl', [
            'shutdown', this._path,
        ]);

        this._switch.removeIface(this);

    }

    execDhcp() {

        let eth = this._ethName;

        spawnSync('dhclient', [
            eth,
        ]);

        this._getIp4Addresses();

    }

}

class NgSwitch {

    constructor(ngHub, hubHook) {

        let hubName = ngHub.getName();

        this._hub = ngHub;
        this._hubName = hubName;
        this._hubHook = hubHook;
        this._path = `${hubName}:${hubHook}`
        this._ifaces = [];
        this._countPorts = 32;
        this._activePorts = 1;

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
        let iface = new NgIface(this, hook);

        this._ifaces[key] = iface;
        this._activePorts++;

        return iface;

    }

    removeIface(iface) {

        let key = this._ifaces.indexOf(iface);

        if (key === -1) return;

        this._ifaces[key] = null;
        this._activePorts--;

        if (this.isEmpty()) this.destroy();

    }

    destroy() {

        this._ifaces.map(iface => {

            iface.destroy();

        });

        this._ifaces = [];

        spawnSync('ngctl', [
            'shutdown', this._path
        ]);

        this._hub.removeSwitch(this);

    }

    isEmpty() {

        return this._activePorts === 1;

    }

    isFilled() {

        let result = this._ifaces.indexOf(null);

        return result === -1 ? true : false;

    }

    getPath() { return this._path; }

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
        let sw = new NgSwitch(this, hook);
        this._switches.push(sw);

        return sw;

    }

    removeSwitch(ngSwitch) {

        let key = this._switches.indexOf(ngSwitch);
        if (key !== -1) delete(this._switches[key]);

    }

    getName() { return this._name }

    getSwitches() { return this._switches; }

    getAvilableSwitch() {

        let sws = this._switches;

        if (!sws.length) return this.createSwitch(); 

        let sw = sws.find(sw => sw.isFilled() ? false : true );

        return sw ? sw : this.createSwitch();

    }

    destroy() {

        this._switches.map(ngSwitch => {

            ngSwitch.destroy();

        });

        this._switches = [];

        spawnSync('ngctl', [
            'shutdown', `${this._name}:`
        ]);

    }

}

module.exports = IpDHCP;
