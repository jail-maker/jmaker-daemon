'use strict';

const recorderPool = require('../libs/recorder-pool');

async function stop(jailName) {

    let recorder = recorderPool.get(jailName);

    await recorder.rollback();

    return;

}

module.exports = stop;
