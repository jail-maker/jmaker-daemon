'use strict';

const { spawnSync } = require('child_process');
const ExecutionError = require('./errors/execution-error');
const CommandInterface = require('./command-interface');

class Cpuset extends CommandInterface {

    constructor({ jid, value }) {

        super();

        this._jid = jid;
        this._value = value;

    }

    async exec() {

        let result = spawnSync('cpuset', [
            '-l', this._value, '-j', this._jid
        ]);

        if (result.status !== 0)
            throw new ExecutionError('Error execution cpuset.');

    }

    async unExec() { }

}

module.exports = Cpuset;
