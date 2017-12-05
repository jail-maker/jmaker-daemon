'use strict';

class LogMessage {

    constructor(level, text, last = false) {

        this.level = level.toString();
        this.text = text;
        this.last = last;

    }

    toString() {

        return JSON.stringify(this);

    }

}

module.exports = LogMessage;
