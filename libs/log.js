'use strict';

const EventEmitter = require('events');

class Log extends EventEmitter {

    constructor(name) {

        super();

        this._name = name;
        this._messages = [];

    }

    message(text) {

        this._messages.push(text);
        this.emit('message', text);

    }

    finish() {

        this.emit('finish');

    }

    toString() {

        return this._messages.join('\n');

    }

}

module.exports = Log;
