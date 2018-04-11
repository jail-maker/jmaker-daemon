'use strict';

const fs = require('fs');
const path = require('path');
const uniqid = require('uniqid');
const zfs = require('../zfs.js');
const compress = require('../compress.js');
const decompress = require('../decompress.js');
const foldesDiff = require('../folders-diff.js');

const NotFoundError = require('../errors/not-found-error.js');

const FIRST = 'first';
const LAST = 'last';

const escapeString = str => {

    let exp = /([\W])/gu;
    return str.replace(exp, '\\$1');

}

class Layer {

    constructor() {

        this.name = '';
        this.path = '';

    }

    setQuota(value) {

        zfs.set(this.name, 'quota', value);

    }

    snapshot(name = null) {

        if (!name) name = (new Date).toISOString();
        zfs.snapshot(this.name, name);

    }

    rollback(name = null) {

        if (name) zfs.rollback(this.name, name);
        else {

            let name = this.lastSnapshot;
            if (!name) throw new NotFoundError('Not found last snapshot.');

            zfs.rollback(this.name, name);

        }

    }

    async compress() {

        try {

            zfs.snapshot(this.name, LAST);

        } catch (error) {

            if (error.name !== 'ExistsError')
                throw error;

        }

        let snapDir = path.join(this.path, '/.zfs/snapshot');
        let diff = await foldesDiff(`${snapDir}/${LAST}/`, `${snapDir}/${FIRST}/`);

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

    get firstSnapshot() {

        let snapshots = zfs.list({
            prefix: this.name,
            type: 'snapshot',
            sortAsc: 'creation',
        });

        if (snapshots.length) {

            return snapshots[0].split('@')[1];

        } else return undefined;

    }

    get lastSnapshot() {

        let snapshots = zfs.list({
            prefix: this.name,
            type: 'snapshot',
            sortDesc: 'creation',
        });

        if (snapshots.length) {

            return snapshots[0].split('@')[1];

        } else return undefined;

    }

    get snapshots() {

        return zfs.list({
            prefix: this.name,
            type: 'snapshot',
            sortAsc: 'creation',
        })
            .map(snap => snap.split('@')[1]);

    }

    get parent() {

        let origin = zfs.get(this.name, 'origin');
        let matches = origin.match(/\b([^\/]+)@/u);
        return matches ? matches[1] : null;

    }

    hasSnapshot(name) {

        return this.snapshots.includes(name);

    }

    destroy() {

        zfs.destroy(this.name);

    }

    promote() {

        zfs.destroy(this.name, LAST);
        zfs.destroy(this.name, FIRST);
        zfs.promote(this.name);
        zfs.destroy(this.name, LAST);

    }

}

module.exports = Layer;
