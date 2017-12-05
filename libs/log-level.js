'use strict';

class LogLevel {

    constructor(levelName = 'info') {

        this.number = 4;
        this.color = null;

        switch (levelName) {

            case 'debug':
                this.number = 5;
                break;

            case 'info':
                this.number = 4;
                break;

            case 'notice':
                this.number = 3;
                this.color = 'green';
                break;

            case 'warn':
                this.number = 2;
                this.color = 'yellow';
                break;

            case 'crit':
                this.number = 1;
                this.color = 'red';
                break;

            default:
                this.number = 4;
                break;

        }

    }

    toString() {

        return this.number;

    }

}

module.exports = LogLevel;
