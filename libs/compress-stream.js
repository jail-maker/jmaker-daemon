'use strict';

const {spawn, spawnSync} = require('child_process');

module.exports = (src, options, call = _ => {}) => {

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

    let child = spawn('tar', [
        ...cd, ...exArg, '-ca', '-f', '-', '-T', '-'
    ]);

    child.stdin.write(src.join('\n'));
    child.stdin.end();

    let stderr = '';

    child.stderr.on('data', data => stderr += data);

    child.on('exit', (code, signal) => {

        call(code, stderr);

    });

    return child.stdout;

};
