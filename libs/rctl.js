'use strict';

const { spawn, spawnSync } = require('child_process')
const RctlRule = require('./rctl-rule.js');
const ExecutionError = require('../libs/errors/execution-error.js');

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

    async run() {

        this._rules.forEach(rule => {

            let result = spawnSync('rctl', [
                '-a', rule.toString()
            ]);

            if (result.status !== 0)
                throw new ExecutionError('Error execution rctl.');

        });

    }

    async rollback() {

        this._rules.forEach(rule => {

            let result = spawnSync('rctl', [
                '-r', rule.getRuleName()
            ]);

        });

    }

}

module.exports = Rctl;
