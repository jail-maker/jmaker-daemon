'use strict';

const { spawnSync, spawn } = require('child_process');
const defaultIface = require('../libs/default-iface.js');

class AutoIp {

    pipeRule(rules) {

        let rule = rules['ip4.addr'];

        if (rule.data === 'AUTO') {

            let ip4Addr = defaultIface.getIp4Addresses()[0];

            console.log(ip4Addr);

            let freeIp = spawnSync('/usr/local/bin/check_ip', [
                `--ipv4=${ip4Addr.network}`, '-j', 
            ]).stdout.toString();

            freeIp = JSON.parse(freeIp)['free4'];

            rule.view = `ip4.addr = "${defaultIface.getEthName()}|${freeIp}";`;

        }

        return rules;

    }

}

module.exports = new AutoIp;
