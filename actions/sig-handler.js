'use strict';

const dataJails = require('../libs/data-jails');
const stop = require('./stop');

module.exports = async _ => {

    try {

        await Promise.all(dataJails.getNames().map(stop));

    } catch (e) {

        console.log(e);

    } finally {

        process.exit();

    }

}
