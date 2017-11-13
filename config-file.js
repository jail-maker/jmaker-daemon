'use strict';

const { writeFileSync } = require('fs');

class ConfigFile {

    constructor(data = {}, name) {

        this._data = data;
        this._name = name;

    }

    pipe(callback) {

        this._data = callback(this._data);
        return this;

    }

    getName() { return this._name; }

    toString() {

        let data = this._data;
        let name = this._name;
        let ret = '';

        ret += `${name} {\n`;

        for (let key in data) {

            let value = data[key];
            let type = typeof(data[key]);

            if (type === 'boolean') {

                ret += value ? `  ${key};\n` : '';

            } else if (Array.isArray(value)) {

                ret += value.reduce((acc, current) => {

                    return `${acc}  ${key} += "${current}";\n`;

                }, []);

            } else {

                ret += `  ${key} = "${data[key]}";\n`;

            }

        }

        ret += `}`;

        return ret;
    }

    save(path) {

        writeFileSync(path, this.toString(), { flags: 'w' });

    }

}

module.exports = ConfigFile;
