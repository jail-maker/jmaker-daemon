'use strict';

const fs = require('fs');

class Hosts {

    constructor() {

        this._data = '';
        this._marker = '# jmaker host';

        this._loadFile();

    }

    addHost(ip, hostName) {

        this._data += `${ip} ${hostName} ${this._marker}\n`;

    }

    rmHost(hostName) {

        hostName = hostName.replace(/(\W)/mg, '\\$1');
        let marker = this._marker.replace(/(\W)/mg, '\\$1');
        let exp = new RegExp(`^(\\d+\\.?){4} ${hostName} ${marker}\n`, 'mg');
        this._data = this._data.replace(exp, '');

    }

    _loadFile() {

        let data = fs.readFileSync('/etc/hosts');
        this._data = data.toString();

    }

    commit() {

        fs.writeFileSync('/etc/hosts', this._data);

    }

}

module.exports = new Hosts;
