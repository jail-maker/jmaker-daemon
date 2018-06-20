'use strict';

const fs = require('fs');
const zfs = require('../zfs');
const path = require('path');

const compressStream = require('../compress-stream');
const decompress = require('../decompress');
const RawArgument = require('../raw-argument');

class Dataset {

    static create(name) {

        zfs.create(name);
        return new this(name);

    }

    static createIfNotExists(name) {

        if (zfs.has(name)) return this.getDataset(name);
        else return this.create(name);

    }

    static getDataset(name) {

        return new this(name);

    }

    static existsDataset(name) {

        return zfs.has(name)

    }

    constructor(name) {

        if (!zfs.has(name)) throw new Error(`dataset ${name} not exists.`);
        this._name = name;

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

        } else return null;

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

        } else return null;

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
