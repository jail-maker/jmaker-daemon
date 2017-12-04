'use strict';

const EventEmitter = require('events');
const chalk = require('chalk');
const Channel = require('./channel.js');

class Log extends EventEmitter {

    constructor(name) {

        super();

        this._name = name;
        this._messages = [];
        this._channel = new Channel(`jmaker:log:${name}`);

    }

    info(text) {

        console.log(text);
        this.message('info', text);

    }

    notice(text) {

        console.log(chalk.green(text));
        this.message('notice', text);

    }

    warn(text) {

        console.log(chalk.yellow(text));
        this.message('warn', text);

    }

    crit(text) {

        console.log(chalk.red(text));
        this.message('crit', text);

    }

    message(level = 'info', text) {

        let message = new LogMessage(level, text);
        this._channel.publish(message);
        this._messages.push(message);
        this.emit('message', message);

    }

    finish() {

        this._channel.close();
        this.emit('finish');

    }

    toString() {

        return this._messages
            .map(mesage => message.text)
            .join('\n');

    }

}

class LogMessage {

    constructor(level = 'info', text) {

        this.level = level;
        this.text = text;

    }

    toString() {

        return JSON.stringify(this);

    }

}

module.exports = Log;
