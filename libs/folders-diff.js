'use strict';

const { spawn, spawnSync, exec } = require('child_process');
const fs = require('fs');

const ACTIONS = {'+': 'A', '-': 'D'};

const diff = (...folders) => {

    return new Promise((res, rej) => {

        let resData = '';
        let rejData = '';

        let command = folders
            .map(folder => `<(cd ${folder} && find ./ -type flc -exec sha256 -r {} \\; | sort)`)
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

}

class DiffOut {

    toString() {

        let ret = '';

        for (let line of this.genLines())
            ret += `${line[0]} ${line[1]}\n`;

        return ret.trim('\n');

    }

    files(marks = ['A', 'D', 'C']) {

        let ret = [];

        for (let line of this.genLines()) {

            if (marks.includes(line[0])) ret.push(line[1]);

        }

        return ret;

    }

    * genLines() {

        for (let file in this) {

            yield [this[file], file];

        }

    }

    * [Symbol.iterator]() {

        return this.genLines();

    }

}


module.exports = async (...folders) => {

    let diffOut = (await diff(...folders))
        .toString()
        .trim('\n');

    let exp = /^([\+\-])\s*\w+\s([^+].*)$/miu;

    let ret = diffOut.split('\n').reduce((acc, line, key) => {

        let matches = line.match(exp);
        if (!matches) return acc;

        let action = matches[1];
        let file = matches[2];

        if (acc[file]) {

            acc[file] = 'C';
            return acc;

        }

        acc[file] = ACTIONS[action];
        return acc;

    }, new DiffOut); 

    return ret;

};
