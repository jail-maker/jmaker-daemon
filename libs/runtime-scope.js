'use strict';

const intProcessEmitter = require('./interrupt-process-emitter.js');
const EventEmitter = require('events');

class RuntimeScope extends EventEmitter {

    constructor() {

        super();

        intProcessEmitter.prependListener('int', _ => this.emit('int'));

    }

    close() {

        console.log('close scope');
        intProcessEmitter.removeListener('int', this.int);
        this.removeAllListeners('int');

    }

}

module.exports = RuntimeScope;
