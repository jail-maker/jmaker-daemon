'use strict';

const EventEmitter = require('events');
const Channel = require('./channel.js');

class Log extends EventEmitter {

    constructor(name) {

        super();

        this._name = name;
        this._messages = [];
        this._channel = new Channel(`jmaker:log:${name}`);

    }

    info(text) {

        this.message('info', text);

    }

    warn(text) {

        this.message('warn', text);

    }

    crit(text) {

        this.message('crit', text);

    }

    message(level, text) {

        let message = new LogMessage(level, text);
        this._messages.push(message);
        this._channel.publish(message);
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
