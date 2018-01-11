'use strict';

class RawArgument {

    constructor(data) {

        this._data = data;

    }

    getData() {

        return this._data;

    }

    setData(value) {

        this._data = value;

    }

}

module.exports = RawArgument;
