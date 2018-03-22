'use strict';

const fs = require('fs');
const path = require('path');
const uniqid = require('uniqid');
const zfs = require('../zfs.js');
const compress = require('../compress.js');
const decompress = require('../decompress.js');
const foldesDiff = require('../folders-diff.js');

function escapeString(str) {

    let exp = /([\W])/gu;
    return str.replace(exp, '\\$1');

}

class Layer {

    constructor() {

        this.name = '';
        this.path = '';
        this.parent = null;

    }

    setQuota(value) {

        zfs.set(this.name, 'quota', value);

    }

    async compress() {

        try {

            zfs.snapshot(this.name, 'last');

        } catch (error) {

            if (error.name !== 'ExistsError')
                throw error;

        }

        let snapDir = path.join(this.path, '/.zfs/snapshot');
        let diff = await foldesDiff(`${snapDir}/first`, `${snapDir}/last`);

        let files = diff.files(['A', 'C']);
        files.push('./.diff');

        let archive = `/tmp/jmaker-image-${uniqid()}.txz`;
        let diffFile = path.join(this.path, '.diff');

        fs.writeFileSync(diffFile, diff.toString());

        await compress(files, archive, {
            cd: this.path
        });

        fs.unlinkSync(diffFile);

        return archive;

    }

    async decompress(archive) {

        await decompress(archive, this.path);

        let diffFile = path.join(this.path, '.diff');
        let buffer = fs.readFileSync(diffFile);
        let diff = buffer.toString();

        let lines = diff.split('\n');
        let exp = /^D\s(.+)$/miu;

        lines.forEach(line => {

            let matches = line.match(exp);
            if (!matches) return;

            let file = path.join(this.path, matches[1]);
            fs.unlinkSync(file);

        });

        fs.unlinkSync(diffFile);

    }

    destroy() {

        zfs.destroy(this.name);

    }

}

module.exports = Layer;
