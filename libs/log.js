'use strict';

const EventEmitter = require('events');
const chalk = require('chalk');
const Channel = require('./channel.js');
const config = require('./config.js');
const LogMessage = require('./log-message.js');
const LogLevel = require('./log-level.js');

const logLevel = new LogLevel(config.logLevel);

class Log extends EventEmitter {

    constructor(name) {

        super();

        this._name = name;
        this._messages = [];
        this._channel = new Channel(`jmaker:log:${name}`);

    }

    info(text, last = false) {

        let level = new LogLevel('info');
        return this._message(level, text, last);

    }

    notice(text, last = false) {

        let level = new LogLevel('notice');
        return this._message(level, text, last);

    }

    warn(text, last = false) {

        let level = new LogLevel('warn');
        return this._message(level, text, last);

    }

    crit(text, last = false) {

        let level = new LogLevel('crit');
        return this._message(level, text, last);

    }

    _message(level, text, last) {

        if (level.toString() <= logLevel.toString()) {

            console.log(level.color ? chalk[level.color](text) : text);

        }

        let message = new LogMessage(level, text, last);
        this._messages.push(message);
        return this._channel.publish(message);

    }

    toString() {

        return this._messages
            .map(mesage => message.text)
            .join('\n');

    }

}

module.exports = Log;
