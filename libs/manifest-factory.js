'use strict';

const fs = require('fs');
const Manifest = require('./manifest.js');

class ManifestFactory {

    static fromFile(file) {

        let buffer = fs.readFileSync(file);
        let data = JSON.parse(buffer.toString());
        return Object.assign(new Manifest, data);

    }

    static fromFlatData(data) {

        let manifest = new Manifest;

        let keys = [
            'name',
            'from',
            'env',
            'pkg',
            'dependencies',
            'cpus',
            'cpuset',
            'rctl',
            'mounts',
            'exec.j-poststart',
            'exec.j-prestart',
            'quota',
            'copy',
            'resolv-sync',
        ];

        keys.forEach(key => {

            manifest[key] = data[key];
            delete(data[key]);

        });

        manifest.rules = data;

        return manifest;

    }

}

module.exports = ManifestFactory;
