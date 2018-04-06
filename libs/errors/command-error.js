'use strict';

class CommandError extends Error {

    constructor(message = '') {

        super(message);
        this.name = 'CommandError';
        this.code = 'ECOMMAND';

    }

}

module.exports = CommandError; 
