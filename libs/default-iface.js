'use strict';

const { spawnSync, spawn } = require('child_process');
const jsonQuery = require('json-query');

class DefaultIface {

    constructor() {

        this.eth = '';
        this.ipv4Address = [];
        this.ipv4Network = [];

        this.refresh();

    }

    refresh() {

        this._getIface();
        this._getEthInfo();

    }

    rmAliasIp4(ip = '') {

        spawnSync('ifconfig', [
            this.eth, '-alias', ip
        ]);

    }

    _getEthInfo() {

        let ethInfo = spawnSync('netstat', [
            '-4', '-I', this.eth, '-n' ,'--libxo=json',
        ]).stdout.toString();

        ethInfo = JSON.parse(ethInfo);

        console.log(ethInfo);

        this.ipv4Address = jsonQuery(
            `[**]interface[*name=${this.eth}].address`,
            { data: ethInfo }
        ).value;

        this.ipv4Network = jsonQuery(
            `[**]interface[*name=${this.eth}].network`,
            { data: ethInfo }
        ).value;

    }

    _getIface() {

        let out = spawnSync('netstat', [
            '-r', '-4', '--libxo', 'json',
        ]).stdout.toString();

        out = JSON.parse(out);
        out = out.statistics['route-information']['route-table']['rt-family'];

        let ethIfo = jsonQuery(
            '[address-family=Internet].rt-entry[destination=default]',
            { data: out }
        ).value;

        this.eth = ethIfo['interface-name'];

    }

}

let defaultIface = new DefaultIface;

module.exports = defaultIface;
