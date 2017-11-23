'use strict';

class NotFoundError extends Error {

    constructor(message = '') {

        super(message);
        this.code = 'EFOUND';

    }

}

module.exports = NotFoundError;
