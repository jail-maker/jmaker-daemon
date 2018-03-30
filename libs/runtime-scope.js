'use strict';

const EventEmitter = require('events');

class RuntimeScope extends EventEmitter {

    constructor() {

        super();

        console.log('new scope');
        process.on('SIGINT', this.int);
        process.on('SIGTERM', this.int);

    }

    int() {

        console.log('int');
        console.log('int');
        console.log('int');
        console.log('int');
        console.log('int');
        this.emit('int');

    }

    close() {

        console.log('close scope');
        process.removeListener('SIGINT', this.int);
        process.removeListener('SIGTERM', this.int);
        this.removeAllListeners('int');

    }

}

module.exports = RuntimeScope;
