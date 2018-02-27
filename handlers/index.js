'use strict';

const fs = require('fs');
module.exports = fs
    .readdirSync(__dirname)
    .filter(file => file.slice(-3) === '.js')
    .filter(file => file !== 'index')
    .map(file => require(`./${file}`))
    .reduce((carry, handler) => {

        carry[handler.name] = handler;
        return carry;

    }, {});
