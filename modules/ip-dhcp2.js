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
        this._oldIface = defaultIface.intoIface();
        this._ngSwitch = {};
        this._ngIface = {};

    }

    enable() {

        if (this.isEnabled()) return;
        this._enabled = true;

        defaultIface.refresh();
        let oldIface = this._oldIface;

        this._clearEth(defaultIface);
        this._ngSwitch = new NgSwitch(oldIface);

        let iface = this.getIface();

        oldIface.getIp4Addresses().forEach(ip => {

            oldIface.rmIp4Address(ip);
            iface.addIp4Address(ip);

        });

        iface.execDhcp();
        defaultIface.refresh();

        this._ngIface = iface;

    }

    disable() {

        if (!this.isEnabled()) return;

        let iface = this._ngIface;
        let oldIface = this._oldIface;

        iface.getIp4Addresses().forEach(ip => {

            iface.rmIp4Address(ip);
            oldIface.addIp4Address(ip);

        });

        this._ngSwitch.destroy();

        defaultIface.reset();
        oldIface.execDhcp();
        defaultIface.refresh();

        this._enabled = false;

    }

    getIface() {

        let ngSwitch = this._ngSwitch;
        return ngSwitch.createIface();

    }

    isEnabled() { return this._enabled; }

    getPipeRule(dataCell) {

        return (rules) => {

            let ipsRule = rules['ip4.addr'];

            if (ipsRule.data === 'DHCP') {

                if (!this.isEnabled()) this.enable();

                let ngIface = this._ngIface;
                let tmpIface = this.getIface();

                tmpIface.execDhcp();

                let eth = ngIface.getEthName();
                let ip4 = tmpIface.getIp4Addresses()[0];
                ngIface.addIp4Address(ip4);

                tmpIface.destroy();

                ipsRule.view = `ip4.addr = "${eth}|${ip4}";`;

            }

            return rules;

        }

    }

    _clearEth(iface) {

        let eth = iface.getEthName();

        spawnSync('ngctl', [
            'msg', `${eth}:`, 'setpromisc', '1',
        ]);

        spawnSync('ngctl', [
            'msg', `${eth}:`, 'setautosrc', '0',
        ]);

    }

}

class NgIface extends Iface {

    constructor(ngSwitch, switchHook) {

        super();

        let switchPath = ngSwitch.getPath();

        this._switch = ngSwitch;
        this._switchPath = switchPath;
        this._switchHook = switchHook;
        this._path = `${switchPath}${switchHook}`;

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

        let ether = randomMac();
        this.setEther(ether);
        this.up();

    }

    destroy() {

        this.down();

        spawnSync('ngctl', [
            'shutdown', this._path,
        ]);

        this._switch.removeIface(this);

    }

}

class NgSwitch {

    constructor(iface, name = 'jmaker-switch') {

        let ethName = iface.getEthName();

        this._name = name;
        this._path = `${name}:`;
        this._ifaces = [];
        this._countPorts = 32;
        this._activePorts = 2;

        spawnSync('ngctl', [
            'mkpeer', `${ethName}:`, 'bridge', 'lower', 'link0',
        ]);

        spawnSync('ngctl', [
            'connect', `${ethName}:`, `${ethName}:lower`, 'upper', 'link1',
        ]);

        spawnSync('ngctl', [
            'name', `${ethName}:lower`, name,
        ]);

        this._ifaces.length = this._countPorts;
        this._ifaces.fill(null, 0, this._countPorts);
        this._ifaces[0] = `${ethName}:lower`;
        this._ifaces[1] = `${ethName}:upper`;

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

    }

    destroy() {

        this._ifaces.map(iface => {

            if (NgIface.prototype.isPrototypeOf(iface))
                iface.destroy();

        });

        this._ifaces = [];

        spawnSync('ngctl', [
            'shutdown', this._path
        ]);

    }

    isEmpty() {

        return this._activePorts === 2;

    }

    isFilled() {

        let result = this._ifaces.indexOf(null);

        return result === -1 ? true : false;

    }

    getPath() { return this._path; }

}

module.exports = IpDHCP;
