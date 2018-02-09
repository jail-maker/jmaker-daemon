'use strict';

const { spawn, spawnSync, exec } = require('child_process');
const fs = require('fs');

module.exports = (...folders) => {

    return new Promise((res, rej) => {

        let resData = '';
        let rejData = '';

        let command = folders
            .map(folder => `<(cd ${folder} && find ./ -type flc | sort)`)
            .join(' ');

        command = `diff -u ${command}`;

        let child = spawn('bash', [
            '-c', command
        ]);

        child.stdout.on('data', data => resData += data);
        child.stderr.on('data', data => rejData += data);

        child.on('exit', (code, signal) => {

            if (code <= 1) res(resData.trim());
            else {

                let error = new Error(rejData);
                rej(error);

            }

        });

    });

};
