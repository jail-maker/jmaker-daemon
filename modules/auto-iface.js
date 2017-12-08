'use strict';

const defaultIface = require('../libs/default-iface.js');

class AutoIface {

    pipeRule(rules) {

        let rule4 = rules['ip4.addr'];
        let rule6 = rules['ip6.addr'];

        if (!Array.isArray(rule4.data)) rule4.data = [rule4.data];
        if (!Array.isArray(rule6.data)) rule6.data = [rule6.data];

        rule4.data = rule4.data.map(this._replace);
        rule6.data = rule6.data.map(this._replace);

        return rules;

    }

    _replace(item) {

        item = item.replace(/^\?\|/, `${defaultIface.getEthName()}|`);
        return item;

    }

}

module.exports = new AutoIface;
