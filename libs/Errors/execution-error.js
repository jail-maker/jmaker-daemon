'use strict';

class ExecutionError extends Error {

    constructor(message = '') {

        super(message);
        this.code = 'EEXEC';

    }

}

module.exports = ExecutionError; 
