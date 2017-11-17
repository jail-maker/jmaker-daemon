'use strict';

const fs = require('fs');

class Hosts {

    constructor() {

        this._data = '';

        this._loadFile();
    
    }

    addHost(ip, domain) {

        this._data += `${ip} ${domain}\n`;
        this._commitFile();

    }

    rmHost(domain) {

        this._commitFile();

    }

    _loadFile() {

        let data = fs.readFileSync('/etc/hosts');
        console.log(data);
        this._data = data.toString();

    }

    _commitFile() {

        fs.writeFileSync('/etc/hosts', this._data);

    }

}
