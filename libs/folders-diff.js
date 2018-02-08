'use strict';

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');

const listFiles = folder => {

    return new Promise((res, rej) => {

        let resData = '';
        let rejData = '';
        let child = spawn('/usr/bin/find', [
            folder, '-type', 'flc'
        ]);

        child.stdout.on('data', data => resData += data);
        child.stderr.on('data', data => rejData += data);

        child.on('exit', (code, signal) => {

            if (code <= 0) res(resData.trim());
            else {

                let error = new Error(rejData);
                error.code = code;
                error.signal = signal;
                rej(error);

            }

        });

    });

}

const diff = (one, two) => {

    return new Promise((res, rej) => {

        let resData = '';
        let rejData = '';
        let child = spawn('/usr/bin/diff', [
            one, two
        ]);

        child.stdout.on('data', data => resData += data);
        child.stderr.on('data', data => rejData += data);

        child.on('exit', (code, signal) => {

            if (code <= 0) res(resData.trim());
            else {

                let error = new Error(rejData);
                error.code = code;
                error.signal = signal;
                rej(error);

            }

        });

    });

}

(async _ => {

    try {

        let first = listFiles('/usr/jmaker/first');
        let second = listFiles('/usr/jmaker/second');
        let result = await Promise.all([first, second]);

        fs.writeFileSync('/tmp/first.diff', result[0]);
        fs.writeFileSync('/tmp/second.diff', result[1]);

        result = await diff('/tmp/first.diff', '/tmp/second.diff');
        console.log(result);

    } catch(error) {
    
        console.log(error);

    }

})()


