'use strict';

const { writeFileSync } = require('fs');

class ConfigFile {

    constructor(data = {}, name) {

        this._name = name;
        this._rules = {};

        this._setRules(data);

    }

    _setRules(data) {

        for (let key in data) {

            let value = data[key];

            this._rules[key] = new Rule(key, value);

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

        for (let key in rules) {

            let rule = rules[key];
            ret += `${rule.view}\n`;

        }

        ret += `}`;

        return ret;

    }

    out(rules) {

        for (let key in rules) {

            let rule = rules[key];
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

        }

        return rules;

    }

    getValue(rule) {

        return this._rules[rule];

    }

    setRule(key, value) {

        this._rules[key] = value;
        return this;

    }

    save(path) {

        writeFileSync(path, this.toString(), { flags: 'w' });

    }

}

class Rule {

    constructor(key, value, view = '') {

        this.key = key;
        this.data = value;
        this.view = view;

    }

    toString() {

        return this.view;

    }

}

module.exports = ConfigFile;
