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

    static async compressStream(dataset) {

        let diffFile = path.join(this.path, '.diff');
        let files = [];

        if (dataset.parent) {

            let diff = await this.getDiff(dataset, dataset.parentDataset);
            fs.writeFileSync(diffFile, diff.toString());

            files = diff.files(['A', 'C']);

        }

        files.push('./.diff');

        return compressStream(files, {
            cd: this.path
        }, _ => {

            fs.unlinkSync(diffFile);

        });

    }


    constructor(name) {

        if (!zfs.has(name)) throw new Error(`dataset ${name} not exists.`);
        this._name = name;

    }

    fork(name) {

        if (!this.hasSnapshot(SPECIAL_SNAP_NAME)) {

            this.snapshot(SPECIAL_SNAP_NAME);

        }

        zfs.clone(this.name, SPECIAL_SNAP_NAME, name);
        return new Dataset(name);

    }

    setQuota(value) {

        zfs.set(this.name, 'quota', value);

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
            if (!name) throw new NotFoundError('Not found last snapshot.');

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

    get snapDir() {

        return path.join(this.path, '/.zfs/snapshot');

    }

    get name() {

        return this._name;

    }

    get path() {

        return zfs.get(this.name, 'mountpoint');

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
