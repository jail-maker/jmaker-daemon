'use strict';

const defaultIface = require('../libs/default-iface.js');

class AutoIface {

    pipeRule(rules) {

        let rule = rules['ip4.addr'];

        if (!Array.isArray(rule.data)) rule.data = [rule.data];

        rule.data = rule.data.map(item => {

            item = item.replace(/^\?\|/, `${defaultIface.getEthName()}|`);
            return item;

        });

        return rules;

    }

}

module.exports = new AutoIface;
