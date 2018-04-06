'use strict';

class ExistsError extends Error {

    constructor(message = '') {

        super(message);
        this.name = 'ExistsError';
        this.code = 'EEXIST';

    }

}

module.exports = ExistsError;
