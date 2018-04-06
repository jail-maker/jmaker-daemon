'use strict';

class ExecutionError extends Error {

    constructor(message = '') {

        super(message);
        this.name = 'ExecutionError';
        this.code = 'EEXEC';

    }

}

module.exports = ExecutionError; 
