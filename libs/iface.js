'use strict';

const { spawn, spawnSync } = require('child_process');
const jsonQuery = require('json-query');
const Ip4Addr = require('./ip4addr.js');
const NotFoundError = require('./Errors/not-found-error.js');
const ExistsError = require('./Errors/exists-error.js');

class Iface {

    constructor() {

        this._ethName = '';
        this._ipv4Addresses = [];
        this._ether = '00:00:00:00:00:00';

    }

    getIp4Addresses() { return this._ipv4Addresses; }

    getEthName() { return this._ethName; }

    getEther() { return this._ether; }

    setEther(ether) {

        this._ether = ether;

        spawnSync('ifconfig', [
            this._ethName, 'ether', ether,
        ]);

    }

    up() {

        spawnSync('ifconfig', [
            this._ethName, 'up'
        ]);

    }

    down() {

        spawnSync('ifconfig', [
            this._ethName, 'down'
        ]);

    }

    addIp4Address(ip4Addr) {

        let index = this._ipv4Addresses.indexOf(ip4Addr);

        if (index !== -1) {

            let message = `${ip4Addr} already exists in ${this._ethName}.`;
            throw ExistsError(message);

        }

        spawnSync('ifconfig', [
            this._ethName, 'alias', ip4Addr.toString(),
        ]);

        this._ipv4Addresses.push(ip4Addr);

        return this;

    }

    rmIp4Address(ip4Addr) {

        let index = this._ipv4Addresses.indexOf(ip4Addr);

        if (index === -1) {

            let message = `${ip4Addr} not found in ${this._ethName}.`;
            throw NotFoundError(message);

        }

        delete this._ipv4Addresses[index];
        this._ipv4Addresses = this._ipv4Addresses.filter(n => n);

        spawnSync('ifconfig', [
            this._ethName, '-alias', ip4Addr.address
        ]);

    }

    execDhcp() {

        let eth = this._ethName;

        spawnSync('dhclient', [
            eth,
        ]);

        this._getIp4Addresses();

    }

    _getIp4Addresses() {

        let ethInfo = spawnSync('netstat', [
            '-4', '-I', this._ethName, '-n' ,'--libxo=json',
        ]).stdout.toString();

        ethInfo = JSON.parse(ethInfo);

        let ips = jsonQuery(
            `[**]interface[*name=${this._ethName}].address`,
            { data: ethInfo }
        ).value;

        let networks = jsonQuery(
            `[**]interface[*name=${this._ethName}].network`,
            { data: ethInfo }
        ).value;

        ips.forEach((addr, key) => {

            let matches = networks[key].match(/\/(\d+)$/);
            let prefix = matches[1];

            let ipAddr = new Ip4Addr(addr, prefix);
            ipAddr.network = networks[key].trim();
            this._ipv4Addresses.push(ipAddr);

        });

    }

    _getEther() {

        let ethInfo = spawnSync('netstat', [
            '-f', 'link', '-I', this._ethName, '-n' ,'--libxo=json',
        ]).stdout.toString();

        ethInfo = JSON.parse(ethInfo);

        this._ether = jsonQuery(
            `[**]interface[name=${this._ethName}].address`,
            { data: ethInfo }
        ).value;

    }

}

module.exports = Iface;
