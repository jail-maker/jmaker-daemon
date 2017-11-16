'use strict';

const { spawnSync, spawn } = require('child_process');
const defaultIface = require('../libs/default-iface.js');

class AutoIp {

    pipeRule(rules) {

        let rule = rules['ip4.addr'];

        if (rule.data === 'AUTO') {

            console.log(rule);

            let freeIp = spawnSync('check_ip', [
                `--ipv4=${defaultIface.ipv4Network}`, '-j', 
            ]).stdout.toString();

            freeIp = JSON.parse(freeIp)['free4'];

            rule.view = `ip4.addr = "${defaultIface.eth}|${freeIp}";`;

        }

        return rules;

    }

}

module.exports = new AutoIp;
