'use strict';

const zfs = require('../zfs');
const path = require('path');

const foldesDiff = require('../folders-diff');

const SPECIAL_SNAP_NAME = 'forks';

class Dataset {

    static create(name) {

        zfs.create(name);
        return new Dataset(name);

    }

    static createIfNotExists(name) {

        if (zfs.has(name)) return Dataset.getDataset(name);
        else return Dataset.create(name);

    }

    static getDataset(name) {

        return new Dataset(name);

    }

    static async getDiff(first, second) {

        if (!first.hasSnapshot(SPECIAL_SNAP_NAME))
            throw new Error(`not found special snapshot in "${first.name}"`);

        if (!second.hasSnapshot(SPECIAL_SNAP_NAME))
            throw new Error(`not found special snapshot in "${second.name}"`);

        let diff = await foldesDiff(
            `${first.snapDir}/${SPECIAL_SNAP_NAME}/`,
            `${second.snapDir}/${SPECIAL_SNAP_NAME}/`
        );

        return diff;

    }

    constructor(name) {

        if (!zfs.has(name)) throw new Error(`dataset ${name} not exists.`);
        this._name = name;

    }

    fork(name) {

        this.ensureSpecialSnapshot();

        zfs.clone(this.name, SPECIAL_SNAP_NAME, name);
        return new Dataset(name);

    }

    setQuota(value) {

        zfs.set(this.name, 'quota', value);

    }

    ensureSpecialSnapshot() {

        if (!this.hasSnapshot(SPECIAL_SNAP_NAME)) {

            this.snapshot(SPECIAL_SNAP_NAME);

        }

    }

    snapshot(name = null) {

        if (!name) name = (new Date).toISOString();
        zfs.snapshot(this.name, name);
        return name;

    }

    rollback(name = null) {

        if (name) zfs.rollback(this.name, name);
        else {

            let name = this.lastSnapshot;
            if (!name) throw new Error('Not found last snapshot.');

            zfs.rollback(this.name, name);

        }

    }

    hasSnapshot(name) {

        return this.snapshots.includes(name);

    }

    destroy() {

        zfs.destroy(this.name);

    }

    async commit(name, action = _ => {}) {

        if (!(name instanceof RawArgument)) {

            name = sha256(name);
            name = name.slice(0, 12);

        } else {

            name = name.getData();

        }

        if (this.hasSnapshot(name)) return;

        this.snapshot(name);

        try {

            await action(this);

        } catch (error) {

            this.rollback();
            throw error;

        }

    }

    async compressStream() {

        let files = [];
        let diffFile = path.join(this.path, '.diff');
        let diffFileContent = '';

        if (this.parent) {

            let parent = new Dataset(this.parent);
            let diff = await Dataset.getDiff(this, parent);

            files = diff.files(['A', 'C']);
            diffFileContent = diff.toString();

        }

        fs.writeFileSync(diffFile, diffFileContent);
        files.push('./.diff');

        return compressStream(files, {
            cd: this.path
        }, _ => {

            fs.unlinkSync(diffFile);

        });

    }

    async decompress(archive) {

        await decompress(archive, this.path);

        let diffFile = path.join(this.path, '.diff');

        let buffer = null;

        try {

            buffer = fs.readFileSync(diffFile);

        } catch (error) {

            if (error.code === 'ENOENT') return;
            else throw error;

        }

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

    get snapDir() {

        return path.join(this.path, '/.zfs/snapshot');

    }

    get name() {

        return this._name;

    }

    get path() {

        return zfs.get(this.name, 'mountpoint');

    }

    get firstSnapshot() {

        let snapshots = zfs.list({
            prefix: this.name,
            type: ['snapshot'],
            sortAsc: ['creation'],
        });

        if (snapshots.length) {

            return snapshots[0].split('@')[1];

        } else return undefined;

    }

    get lastSnapshot() {

        let snapshots = zfs.list({
            prefix: this.name,
            type: ['snapshot'],
            sortAsc: ['creation'],
        });

        if (snapshots.length) {

            let index = snapshots.length - 1;
            return snapshots[index].split('@')[1];

        } else return undefined;

    }

    get snapshots() {

        return zfs.list({
            prefix: this.name,
            type: ['snapshot'],
            sortAsc: ['creation'],
        })
            .map(snap => snap.split('@')[1]);

    }

    get parent() {

        let origin = zfs.get(this.name, 'origin');
        let matches = origin.match(/^(.+)@/u);
        return matches ? matches[1] : null;

    }

}

module.exports = Dataset;
