'use strict';

class CommandError extends Error {

    constructor(message = '') {

        super(message);
        this.code = 'ECOMMAND';

    }

}

module.exports = CommandError; 
