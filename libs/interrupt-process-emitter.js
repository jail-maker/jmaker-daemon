'use strict';

const EventEmitter = require('events');

class InterruptProcessEmitter extends EventEmitter {

    constructor() {

        super();

        this.on('int', _ => { console.log('Bye bye.'); });
        this.on('int', process.exit);

        process.prependListener('SIGINT', _ => this.emit('int'));
        process.prependListener('SIGTERM', _ => this.emit('int'));
        process.prependListener('beforeExit', _ => this.emit('int'));

    }

}

module.exports = new InterruptProcessEmitter;
