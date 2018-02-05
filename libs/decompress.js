'use strict';

const {spawn, spawnSync} = require("child_process");
const fs = require("fs");

module.exports = (archive, dst, remove = false) => {

    return new Promise((res, rej) => {

        let child = spawn('tar', ['-xf', archive, '-C', dst]);

        child.on('exit', (code, signal) => {

            if (remove) fs.unlinkSync(archive);
            if (code <= 0) res({code, signal});
            else rej({code, signal});

        });

    });

};
