'use strict';

const Redis = require('ioredis');
const EventEmitter = require('events');

class Channel extends EventEmitter {

    constructor(name) {

        super();

        this._name = name;
        this._redis = new Redis;

    }

    publish(message) {

        let type = typeof(message);
        if (type !== 'string') message = message.toString();

        return this._redis.publish(this._name, message);

    }

    subscribe(callback) {

        this._redis.on('message', callback);
        this._redis.subscribe(this._name);

    }

    close() {

        this._redis.quit();

    }

}

module.exports = Channel;
