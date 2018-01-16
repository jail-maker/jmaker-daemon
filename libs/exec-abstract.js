'use strict';

class ExecAbstract {

    constructor(jailName, commands = [], env = {}) {

        if (!Array.prototype.isPrototypeOf(commands))
            commands = [commands];

        this._jailName = jailName;
        this._commands = commands;
        this._env = env;

    }

    _normalizeCmd(command) {

        if (typeof(command) === 'string')
            command = {cmd: command, env: {}};

        command = Object.assign(new Command, command);

        return command;

    }

}

class Command {

    constructor() {

        this.cmd = '';
        this.env = {};

    }

    toString() {

        return JSON.stringify(this);

    }

}

module.exports = ExecAbstract;
