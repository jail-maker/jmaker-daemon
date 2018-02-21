'use strict';

const logsPool = require('../libs/logs-pool.js');
const { copy, copySync } = require('fs-extra');
const path = require('path');

const chains = require('../libs/layers/chains.js');

class Copy {

    constructor(jailName, context, copys = []) {

        if (!Array.prototype.isPrototypeOf(copys))
            copys = [copys];

        this._jailName = jailName;
        this._copys = copys;
        this._context = context;

    }

    async run() {

        let copys = this._copys;
        let context = this._context;
        let log = logsPool.get(this._jailName);
        let chain = chains.get(this._jailName);

        for (let i = 0; i != copys.length; i++) {

            let name = `${copys[i].join(' ')} ${this._jailName}`;

            await chain.layer(name, async storage => {

                if (typeof(copys[i]) === 'string') 
                    copys[i] = [copys[i], copys[i]];

                let [src, dst] = copys[i];

                dst = path.join(storage.path, path.resolve('/', dst));
                src = path.join(context.path, path.resolve('/', src));

                copySync(src, dst);

            });

        }

    }

    async rollback() { }

}

module.exports = Copy;
