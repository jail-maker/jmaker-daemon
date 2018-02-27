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

        Object.assign(manifest.env, args);

    }

}

module.exports = new Env;
