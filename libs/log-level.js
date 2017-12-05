'use strict';

class LogLevel {

    constructor(levelName = 'info') {

        this._number = 4;

        switch (levelName) {

            case 'debug':
                this._number = 5;
                break;

            case 'info':
                this._number = 4;
                break;

            case 'notice':
                this._number = 3;
                break;

            case 'warn':
                this._number = 2;
                break;

            case 'crit':
                this._number = 1;
                break;

            default:
                this._number = 4;
                break;

        }

    }

    toString() {

        return this._number;

    }

}

module.exports = LogLevel;
