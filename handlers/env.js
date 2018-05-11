'use strict';

class Env {

    constructor() {

        this.name = 'env';

    }

    async do(data = {}) {

        let {
            manifest,
            args = [],
        } = data;

        console.log('set env:', args);
        manifest.env = Object.assign(manifest.env, args);
        console.log('new env:', manifest.env);

    }

}

module.exports = new Env;
