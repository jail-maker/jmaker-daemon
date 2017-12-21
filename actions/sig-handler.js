'use strict';

const dataJails = require('../libs/data-jails.js');
const dhcp = require('../modules/ip-dhcp.js');
const stop = require('./stop.js');

module.exports = async _ => {

    try {

        await Promise.all(dataJails.getNames().map(stop));
        dhcp.disable();

    } catch (e) {

        console.log(e);

    } finally {

        process.exit();

    }

}
