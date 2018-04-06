'use strict';

const { spawnSync } = require('child_process');
const ExecutionError = require('../libs/errors/execution-error.js');

class Cpuset {

    constructor(jid, value) {

        this._jid = jid;
        this._value = value;

    }

    async run() {

        let result = spawnSync('cpuset', [
            '-l', this._value, '-j', this._jid
        ]);

        if (result.status !== 0)
            throw new ExecutionError('Error execution cpuset.');

    }

    async rollback() { }

}

module.exports = Cpuset;
