'use strict';

const { spawnSync, spawn } = require('child_process');
const jsonQuery = require('json-query');

class DefaultIface {

    constructor() {

        this.eth = this._getIface();
        this.ipv4Address = '';
        this.ipv4Network = '';

        this._getEthInfo();

    }

    _getEthInfo() {

        let ethInfo = spawnSync('netstat', [
            '-4', '-I', this.eth, '-n' ,'--libxo=json',
        ]).stdout.toString();

        ethInfo = JSON.parse(ethInfo);

        console.log(ethInfo);

        this.ipv4Address = jsonQuery(
            `[**]interface[name=${this.eth}].address`,
            { data: ethInfo }
        ).value;

        this.ipv4Network = jsonQuery(
            `[**]interface[name=${this.eth}].network`,
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

        let eth = ethIfo['interface-name'];
        return eth;

    }

}

let defaultIface = new DefaultIface;

let proxy = new Proxy(defaultIface, {

    set(target, prop, value) {

        throw new Error('value not writable.');

    },

});

module.exports = proxy;
