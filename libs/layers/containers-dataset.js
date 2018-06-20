'use strict';

const fs = require('fs');
const path = require('path');
const uuid4 = require('uuid/v4');
const sha256 = require('js-sha256').sha256;

const zfs = require('../zfs');
const Dataset = require('./dataset');
const foldesDiff = require('../folders-diff');
const compressStream = require('../compress-stream');
const decompress = require('../decompress');
const RawArgument = require('../raw-argument');

const SPECIAL_SNAP_NAME = 'forks';

class ContainerDataset extends Dataset {

    static get constants() {

        return { SPECIAL_SNAP_NAME };

    }

    static async getDiff(first, second) {

        if (!first.hasSnapshot(SPECIAL_SNAP_NAME))
            throw new Error(`not found special snapshot in "${first.name}".`);

        if (!second.hasSnapshot(SPECIAL_SNAP_NAME))
            throw new Error(`not found special snapshot in "${second.name}".`);

        let diff = await foldesDiff(
            `${first.snapDir}/${SPECIAL_SNAP_NAME}/`,
            `${second.snapDir}/${SPECIAL_SNAP_NAME}/`
        );

        return diff;

    }

    fork(name) {

        this.ensureSpecialSnapshot();

        zfs.clone(this.name, SPECIAL_SNAP_NAME, name);
        return new ContainerDataset(name);

    }

    ensureSpecialSnapshot() {

        if (!this.hasSnapshot(SPECIAL_SNAP_NAME)) {

            this.snapshot(SPECIAL_SNAP_NAME);

        }

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

            let parent = new ContainerDataset(this.parent);
            let diff = await ContainerDataset.getDiff(this, parent);

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

}

module.exports = ContainerDataset;
