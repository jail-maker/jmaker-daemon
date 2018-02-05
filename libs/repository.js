'use strict';

const fs = require('fs');
const request = require('request-promise-native');
const fetch = require('./bsd-fetch.js');

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

}

module.exports = Repository;
