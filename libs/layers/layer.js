'use strict';

const fs = require('fs');
const path = require('path');
const Zfs = require('../zfs.js');
const compress = require('../compress.js');
const decompress = require('../decompress.js');

function escapeString(str) {

    let exp = /([\W])/gu;
    return str.replace(exp, '\\$1');

}

class Layer {

    constructor() {

        this._pool = '';
        this.name = '';
        this.path = '';
        this.parent = null;

    }

    async compress() {

        let zfs = new Zfs(this._pool);

        try {

            zfs.snapshot(this.name, 'last');

        } catch (error) {

            if (error.name !== 'ExistsError')
                throw error;

        }

        let diff = zfs.diff(`${this.name}@first`, `${this.name}@last`);
        diff = diff.toString().trim('\n');

        let lines = diff.split('\n');
        let exp = /^([RM+])\s+(.+)$/miu;
        let mvExp = /^(.+)\s->\s(.+)$/miu;

        {
            let exp = new RegExp(escapeString(this.path), 'gmu');
            lines = lines.map(line => line.replace(exp, ''));
        }

        let files = lines.reduce((acc, line) => {

            let matches = line.match(exp);
            if (!matches) return acc;

            let action = matches[1];
            let file = matches[2];

            if (file === '/') return acc;

            if (action === 'R') file = file.match(mvExp)[2];
            file = file.replace(/^\//, '');

            acc.push(file);
            return acc;

        }, []);

        files.push('.diff');

        let archive = '/tmp/jmaker-image.txz';
        let diffFile = path.join(this.path, '.diff');

        fs.writeFileSync(diffFile, lines.join('\n'));

        await compress(files, archive, {
            cd: this.path
        });

        return archive;

    }

    async decompress(archive) {

        await decompress(archive, this.path);

        let diffFile = path.join(this.path, '.diff');
        let buffer = fs.readFileSync(diffFile);
        let diff = buffer.toString();

        let lines = diff.split('\n');
        let exp = /^([R-])\s+(.+)$/miu;
        let mvExp = /^(.+)\s->\s(.+)$/miu;

        lines.forEach(line => {

            let matches = line.match(exp);
            if (!matches) return;

            let action = matches[1];
            let file = matches[2];

            if (action === 'R') file = file.match(mvExp)[1];

            fs.unlinkSync(path.join(this.path, file));

        });


    }

    destroy() {

        let zfs = new Zfs(this._pool);
        zfs.destroy(this.name);

    }

}

module.exports = Layer;
