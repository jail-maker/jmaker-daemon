'use strict';

const fs = require('fs');
const Manifest = require('./manifest.js');

class ManifestFactory {

    static fromFile(file) {

        let manifest = new Manifest;
        let buffer = fs.readFileSync(file);
        let data = JSON.parse(buffer.toString());

        let keys = Object.keys(manifest);

        keys.forEach(key => {

            manifest[key] = data[key];
            delete(data[key]);

        });

        Object.assign(manifest.rules, data);
        return manifest;

    }

    static fromFlatData(data) {

        let manifest = new Manifest;
        let keys = Object.keys(manifest);

        keys.forEach(key => {

            manifest[key] = data[key];
            delete(data[key]);

        });

        Object.assign(manifest.rules, data);
        return manifest;

    }

}

module.exports = ManifestFactory;
