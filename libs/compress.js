'use strict';

const {spawn, spawnSync} = require('child_process');

module.exports = (src, archive, options) => {

    let {
        exclude = [],
        cd = null,
    } = options;

    cd = cd !== null ? ['-C', cd] : [];
    if (typeof(src) === 'string') src = [src];

    let exArg = exclude.reduce((acc, item) => {

        if (item === '') return acc;

        acc.push('--exclude');
        acc.push(item);
        return acc;

    }, []);

    return new Promise((res, rej) => {

        let child = spawn('tar', [
            ...cd, ...exArg, '-ca', '-f', archive, '-T', '-'
        ]);

        child.stdin.write(src.join('\n'));
        child.stdin.end();

        let rejData = '';

        child.stderr.on('data', data => rejData += data);

        child.on('exit', (code, signal) => {

            if (code <= 0) res();
            else {

                let error = new Error(rejData);
                rej(error);

            }

        });

    });

};
