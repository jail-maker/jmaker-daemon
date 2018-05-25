'use strict';

const invokersPool = require('../libs/invokers-pool');

async function stop(jailName) {

    let invoker = invokersPool.get(jailName);
    await invoker.undoAll();

}

module.exports = stop;
