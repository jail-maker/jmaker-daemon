'use strict';

const { copy, copySync } = require('fs-extra');
const path = require('path');
const logsPool = require('../libs/logs-pool.js');
const chains = require('../libs/layers/chains.js');

class Copy {

    constructor() {

        this.name = 'copy';

    }

    async do(data = {}) {

        let {
            manifest,
            context,
            args = [],
        } = data;

        let log = logsPool.get(manifest.name);
        let chain = chains.get(manifest.name);

        if (typeof(args) === 'string') 
            args = [args, args];

        let name = `${args.join(' ')} ${manifest.name}`;

        await chain.layer(name, async storage => {

            let [src, dst] = args;

            src = path.join(context.path, path.resolve('/', src));
            dst = path.join(storage.path, path.resolve(manifest.workdir, dst));

            copySync(src, dst);

        });

    }

}

module.exports = new Copy;
