'use strict';

const {spawn, spawnSync} = require('child_process');

module.exports = (src, archive, exclude = []) => {

    return new Promise((res, rej) => {

        let exArg = exclude.reduce((acc, item) => {

            if (item === '') return acc;

            acc.push('--exclude');
            acc.push(item);
            return acc;

        }, []);

        let child = spawn('tar', [...exArg, '-ca', '-f', archive, src]);

        child.on('exit', (code, signal) => {

            if (code <= 0) res({code, signal});
            else rej({code, signal});

        });

    });

};
