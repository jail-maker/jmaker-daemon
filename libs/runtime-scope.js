'use strict';

const intProcessEmitter = require('./interrupt-process-emitter.js');
const EventEmitter = require('events');

class RuntimeScope extends EventEmitter {

    constructor() {

        super();

        intProcessEmitter.prependListener('int', this.int.bind(this));

    }

    int() {

        this.emit('int');
        this.emit('destroy');

    }

    close() {

        this.emit('close');
        this.removeAllListeners('close');
        this.emit('destroy');
        this.removeAllListeners('destroy');
        intProcessEmitter.removeListener('int', this.int.bind(this));
        this.removeAllListeners('int');

    }

}

module.exports = RuntimeScope;
