'use strict';

class ExecAbstract {

    constructor(jailName, commands = [], options = {}) {

        let {
            env = {},
            workdir = '/',
        } = options;

        if (!Array.prototype.isPrototypeOf(commands))
            commands = [commands];

        this._jailName = jailName;
        this._commands = commands;
        this._env = env;
        this._workdir = workdir;

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
