'use strict';

const invokersPool = require('../libs/invokers-pool');

async function stop(containerId) {

    let invoker = invokersPool.get(containerId);
    await invoker.undoAll();

}

module.exports = stop;
