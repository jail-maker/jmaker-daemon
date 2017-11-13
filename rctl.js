'use strict';

const { spawn, spawnSync } = require('child_process')
const RctlRule = require('./rctl-rule.js');

class Rctl {

    constructor(rulset, jailName) {

        this._rulset = rulset;
        this._jailName = jailName;
        this._rules = [];

        for (let key in rulset) {

            let resource = key;
            let actions = rulset[key];

            for (let action in actions) {

                let data = {
                    resource: resource,
                    action: action,
                    value: actions[action],
                    jailName: jailName,
                };

                this._rules.push(new RctlRule(data));

            }


        }

    }

    execute() {

        this._rules.forEach(rule => {

            spawnSync('rctl', [
                '-a',
                rule.toString()
            ]);

        });

    }

}

module.exports = Rctl;
