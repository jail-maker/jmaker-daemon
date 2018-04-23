'use strict';

const {spawn, spawnSync} = require("child_process");
const fs = require("fs");

module.exports = (dst, options = {}) => {

    let {remove = false, files = []} = options;

    let child = spawn('tar', ['-xf', '-', '-C', dst, ...files], {
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';

    child.stderr.on('data', data => stderr += data);

    child.on('exit', (code, signal) => {

        call(code, stderr);

    });

    return child.stdin;

};
