'use strict';

const fs = require('fs');
const request = require('request-promise-native');
const fetch = require('./bsd-fetch.js');
const compress = require('./compress.js');
const ZfsStorage = require('./zfs-storage.js');
const config = require('./config.js');
const Layers = require('./layers');

const API_VERSION = 'v1';

class Repository {

    constructor(repo) {

        this._repo = repo
        this._origin = `http://${repo}/api/${API_VERSION}`;

    }

    async getMeta(image) {

        let meta = await request(`${this._origin}/images/${image}`);
        return JSON.parse(meta);

    }

    downloadImage(image, dst) { 

        return fetch(`${this._origin}/images/${image}/data`, dst);

    }

    async getParents(image) {

        let data = await request(`${this._origin}/images/${image}/parents`);
        return JSON.parse(data);

    }

    async hasImage(image) {

        try {

            await request(`${this._origin}/images/${image}`);
            return true;

        } catch (error) {

            return false;

        }

    }

    async push(image) {

        let layers = new Layers(config.imagesLocation);
        let layer = layers.get(image);
        let archive = await layer.compress();

        try {

            await request({
                method: 'POST',
                json: true,
                uri:  `${this._origin}/images`,
                body: {
                    name: image,
                    maintainer: '-',
                    version: '-',
                    parent: layer.parent,
                },
            });

        } catch (error) {

            if (error.statusCode !== 409) throw error;

        }

        await request({
            method: 'PUT',
            uri:  `${this._origin}/images/${image}/data`,
            formData: {
                data: fs.createReadStream(archive),
            }
        });

    }

}

module.exports = Repository;
