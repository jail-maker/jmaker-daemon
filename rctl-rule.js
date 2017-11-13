'use strict';

class RctlRule {

    constructor(data) {

        this._data = data;

    }

    toString() {

        let {
            resource,
            action,
            value,
            jailName
        } = this._data;

        return `jail:${jailName}:${resource}:${action}=${value}`;

    }

}

module.exports = RctlRule;
