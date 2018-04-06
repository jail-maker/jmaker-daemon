'use strict';

class NotFoundError extends Error {

    constructor(message = '') {

        super(message);
        this.name = 'NotFoundError';
        this.code = 'EFOUND';

    }

}

module.exports = NotFoundError;
