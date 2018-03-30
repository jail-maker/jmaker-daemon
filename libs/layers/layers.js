'use strict';

const zfs = require('../zfs.js');
const Layer = require('./layer.js');
const path = require('path');

const FIRST = 'first';
const LAST = 'last';

class Layers {

    constructor(location = 'zroot') {

        this._location = location;

    }

    create(name, parent = null) {

        name = path.join(this._location, name);

        if (parent === null) {

            zfs.create(name);

        } else {

            let from = path.join(this._location, parent);

            try {

                zfs.snapshot(from, LAST);

            } catch (error) {

                if (error.name !== 'ExistsError')
                    throw error;

            }

            zfs.clone(from, LAST, name);

        }

        zfs.snapshot(name, FIRST);

        let layer = new Layer;
        layer.name = name;
        layer.path = zfs.get(name, 'mountpoint');

        return layer;

    }

    get(name) {

        let layer = new Layer;

        name = path.join(this._location, name);

        if (!zfs.has(name))
            throw new Error(`Dataset "${name}" not found.`);

        layer.name = name;
        layer.path = zfs.get(name, 'mountpoint');

        return layer;

    }

    has(name) {

        name = path.join(this._location, name);
        return zfs.has(name);

    }

    list() {

        return zfs.list(this._location)
            .map(item => item.replace(this._location, ''))
            .map(item => item.replace('/', ''))
            .filter(item => item !== '');

    }

    destroy(name) {

        name = path.join(this._location, name);
        zfs.destroy(name);

    }

}

module.exports = Layers;
