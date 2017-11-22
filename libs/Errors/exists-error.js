'use strict';

class ExistsError extends Error {

    constructor(message = '') {

        super(message);
        this.code = 'EEXIST';

    }

}

module.exports = ExistsError;
