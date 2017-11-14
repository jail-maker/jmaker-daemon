'use strict';

const { writeFileSync } = require('fs');

class ConfigFile {

    constructor(data = {}, name) {

        this._name = name;
        this._rules = [];

        this._setRules(data);
        this.pipe(this._pipeRule);

    }

    _setRules(data) {

        for (let key in data) {

            let value = data[key];

            this._rules.push({
                key: key,
                data: value,
                view: '',
            });

        }

    }

    pipe(callback) {

        this._rules = callback(this._rules);
        return this;

    }

    getName() { return this._name; }

    toString() {

        let rules = this._rules;
        let name = this._name;
        let ret = '';

        ret += `${name} {\n`;

        rules.forEach(rule => {

            ret += `${rule.view}\n`;

        });

        ret += `}`;

        return ret;

    }

    _pipeRule(rules) {

        rules.forEach(rule => {

            let type = typeof(rule.data);

            if (type === 'boolean') {

                rule.view = rule.data ? `  ${rule.key};` : '';

            } else if (Array.isArray(rule.data)) {

                let strings = rule.data.map(item => {

                    return `  ${rule.key} += "${item}";`;

                });

                rule.view = strings.join('\n');

            } else {

                rule.view = `  ${rule.key} = "${rule.data}";`;

            }

        })

        return rules;

    }

    save(path) {

        writeFileSync(path, this.toString(), { flags: 'w' });

    }

}

module.exports = ConfigFile;
