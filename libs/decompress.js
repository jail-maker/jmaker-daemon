'use strict';

const {spawn, spawnSync} = require("child_process");
const fs = require("fs");

module.exports = (archive, dst, {remove = false, files = []}) => {

    return new Promise((res, rej) => {

        let child = spawn('tar', ['-xf', archive, ...files, '-C', dst]);
        let rejData = '';

        child.stderr.on('data', data => rejData += data);

        child.on('exit', (code, signal) => {

            if (remove) fs.unlinkSync(archive);
            if (code <= 0) res();
            else {

                let error = new Error(rejData);
                rej(error);

            }

        });

    });

};
