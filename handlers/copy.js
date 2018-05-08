'use strict';

const { copy, copySync } = require('fs-extra');
const path = require('path');
const logsPool = require('../libs/logs-pool');
const chains = require('../libs/layers/chains');
const Layers = require('../libs/layers/layers');
const config = require('../libs/config');

class Copy {

    constructor() {

        this.name = 'copy';

    }

    async do(data = {}) {

        let {
            layer,
            index,
            manifest,
            context,
            args = [],
        } = data;

        if (typeof(args) === 'string') 
            args = [args, args];

        let name = `${index} ${args.join(' ')} ${manifest.name}`;
        await layer.commit(name, async _ => {

            let [src, dst] = args;

            src = path.join(context.path, path.resolve('/', src));
            dst = path.join(layer.path, path.resolve(manifest.workdir, dst));

            copySync(src, dst);

        });

    }

}

module.exports = new Copy;
