'use strict';

const intProcessEmitter = require('./interrupt-process-emitter.js');
const EventEmitter = require('events');

class RuntimeScope extends EventEmitter {

    constructor() {

        super();

        intProcessEmitter.prependListener('int', _ => this.int);

    }

    int() {

        this.emit('int');

    }

    close() {

        console.log('close scope');
        this.emit('close');
        this.removeAllListeners('close');
        intProcessEmitter.removeListener('int', this.int);
        this.removeAllListeners('int');

    }

}

module.exports = RuntimeScope;
