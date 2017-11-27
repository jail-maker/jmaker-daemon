'use strict';

const Ip4Addr = require('./ip4addr.js');
const NotFoundError = require('./Errors/not-found-error.js');
const ExistsError = require('./Errors/exists-error.js');

class Iface {

    constructor() {

        this._ethName = '';
        this._ipv4Address = [];
        this._ether = '00:00:00:00:00:00';

    }

    getIp4Aliases() {

        return this._ipv4Address;

    }

    addIp4Alias(ip4Addr) {

        let index = this._ipv4Address.indexOf(ip4Addr);

        if (index !== -1) {

            let message = `${ip4Addr} already exists in ${this._ethName}.`;
            throw ExistsError(message);

        }

        spawnSync('ifconfig', [
            this._ethName, 'alias', ip4Addr.toString(),
        ]);

        this._ipv4Address.push(ip4Addr);

        return this;

    }

    rmIp4Alias(ip4Addr) {

        let index = this._ipv4Address.indexOf(ip4Addr);

        if (index === -1) {

            let message = `${ip4Addr} not found in ${this._ethName}.`;
            throw NotFoundError(message);

        }

        delete this._ipv4Address[index];
        this._ipv4Address = this._ipv4Address.filter(n => n);

        spawnSync('ifconfig', [
            this._ethNam, '-alias', ip4Addr.toString()
        ]);

    }

    _getIp4Addr() {

        let ethInfo = spawnSync('netstat', [
            '-4', '-I', this._ethName, '-n' ,'--libxo=json',
        ]).stdout.toString();

        ethInfo = JSON.parse(ethInfo);

        let ips = jsonQuery(
            `[**]interface[*name=${this._ethName}].address`,
            { data: ethInfo }
        ).value;

        let networks = jsonQuery(
            `[**]interface[*name=${this._ethNam}].network`,
            { data: ethInfo }
        ).value;

        ips.forEach((addr, key) => {

            let matches = networks[key].match(/\/(\d+)$/);
            let prefix = matches[1];

            let ipAddr = new IpAddr(addr, prefix);
            this._ipv4Address.push(ipAddr);
            this._aliases.push(ipAddr.toString());

        });

    }

    _getEther() {

        ethInfo = spawnSync('netstat', [
            '-f', 'link', '-I', this._ethName, '-n' ,'--libxo=json',
        ]).stdout.toString();

        this._ether = jsonQuery(
            `[**]interface[name=${this._ethName}].address`,
            { data: ethInfo }
        ).value;

    }

}

module.exports = Iface;
