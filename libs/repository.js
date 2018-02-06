'use strict';

const fs = require('fs');
const request = require('request-promise-native');
const fetch = require('./bsd-fetch.js');
const compress = require('./compress.js');
const ZfsStorage = require('./zfs-storage.js');
const config = require('./config.js');

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

    async getImage(image) { }

    async push(image) {

        console.log(image);

        let zfsStorage = new ZfsStorage(config.zfsPool, image);

        await compress(zfsStorage.getPath(), `/tmp/${image}.txz`);

        try {

            await request({
                method: 'POST',
                json: true,
                uri:  `${this._origin}/images`,
                body: {
                    name: image,
                    maintainer: '-',
                    version: '-',
                    parent: null,
                },
            });

        } catch (error) {

            console.log(error.statusCode);
            if (error.statusCode !== 409) throw error;

        }

        await request({
            method: 'PUT',
            uri:  `${this._origin}/images/${image}/data`,
            formData: {
                data: fs.createReadStream(`/tmp/${image}.txz`),
            }
        });

    }

}

module.exports = Repository;
