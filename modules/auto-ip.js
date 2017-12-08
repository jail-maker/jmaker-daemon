'use strict';

const { spawnSync, spawn } = require('child_process');
const defaultIface = require('../libs/default-iface.js');
const NotFoundError = require('../libs/Errors/not-found-error.js');

class AutoIp {

    pipeRule(rules) {

        {

            let rule = rules['ip4.addr'];
            if (!Array.isArray(rule.data)) rule.data = [rule.data];

            this._forIp4Addr(rule);

        }

        {

            let rule = rules['ip6.addr'];
            if (!Array.isArray(rule.data)) rule.data = [rule.data];

            this._forIp6Addr(rule);

        }

        return rules;

    }

    _forIp4Addr(rule = []) {

        rule.data = rule.data.map(item => {

            if (item.toLowerCase() !== 'auto') return item;

            let ipAddr = defaultIface.getIp4Addresses()[0];
            let freeIp = spawnSync('/usr/local/bin/check_ip', [
                `--ipv4=${ipAddr.network}`, '-j', 
            ]).stdout.toString();

            freeIp = JSON.parse(freeIp)['free4'];

            return `${defaultIface.getEthName()}|${freeIp}`;

        });

    }

    _forIp6Addr(rule = []) {

        rule.data = rule.data.map(item => {

            if (item.toLowerCase() !== 'auto') return item;

            let ipAddrs = defaultIface.getIp6ByType('unicast');

            if (!ipAddrs.length) {

                ipAddrs = defaultIface.getIp6ByType('localUnicast');

            }

            if (!ipAddrs.length) {

                let msg = 'Empty ipv6 addressess.';
                throw new NotFoundError(msg);

            }

            let ipAddr = ipAddrs[0];
            let freeIp = spawnSync('/usr/local/bin/check_ip', [
                `--ipv6=${ipAddr.network}`, '-j', 
            ]).stdout.toString();

            freeIp = JSON.parse(freeIp)['free6'];

            return `${defaultIface.getEthName()}|${freeIp}`;

        });

    }

}

module.exports = new AutoIp;
