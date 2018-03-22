'use strict';

const zfs = require('../zfs.js');
const Layer = require('./layer.js');
const path = require('path');

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

                zfs.snapshot(from, 'last');

            } catch (error) {

                if (error.name !== 'ExistsError')
                    throw error;

            }

            zfs.clone(from, 'last', name);

        }

        zfs.snapshot(name, 'first');

        let layer = new Layer;
        layer.name = name;
        layer.path = zfs.get(name, 'mountpoint');
        layer.parent = parent;

        return layer;

    }

    get(name) {

        let layer = new Layer;

        name = path.join(this._location, name);

        if (!zfs.has(name))
            throw new Error(`Dataset "${name}" not found.`);

        let origin = zfs.get(name, 'origin');
        let matches = origin.match(/\b([^\/]+)@/u);

        layer.name = name;
        layer.path = zfs.get(name, 'mountpoint');
        layer.parent = matches ? matches[1] : null;

        return layer;

    }

    has(name) {

        name = path.join(this._location, name);
        return zfs.has(name);

    }

    list(pool) {

        return zfs.list()
            .map(item => item.replace(pool, ''))
            .map(item => item.replace('/', ''))
            .filter(item => item !== '');

    }

    destroy(name) {

        name = path.join(this._location, name);
        zfs.destroy(name);

    }

}

module.exports = Layers;
