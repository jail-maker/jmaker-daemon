'use strict';

const defaultIface = require('../libs/default-iface.js');

class AutoIface {

    pipeRule(rules) {

        let rule = rules['ip4.addr'];

        if (Array.isArray(rule.data)) {

            let strings = rule.data.map(item => {

                item = item.replace(/^\?\|/, `${defaultIface.eth}|`);
                return `  ${rule.key} += "${item}";`;

            });

            rule.view = strings.join('\n');

        }

        return rules;

    }

}

module.exports = new AutoIface;
