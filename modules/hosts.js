'use strict';

const hosts = require('../libs/hosts.js');

class Hosts {

    constructor(jail) {

        this._jail = jail;

    }

    async run() {

        let jail = this._jail;
        let ip4 = jail.info['ip4.addr'].split(',');

        hosts.addHost(ip4[0], jail.name);
        hosts.addHost(ip4[0], jail.info['host.hostname']);
        hosts.commit();

    }

    async rollback() {

        let jail = this._jail;

        hosts.rmHost(jail.info['name']);
        hosts.rmHost(jail.info['host.hostname']);
        hosts.commit();

    }

}

module.exports = Hosts;

