'use strict';

class Recorder {

    constructor() {

        this._pool = [];

    }

    async run({record, allRollback = true, argv = []}) {

        try {

            let result = await record.run(...argv);
            this._pool.push({ record, argv });
            return result;

        } catch (error) {

            await record.rollback(...argv);
            if (allRollback) await this.rollback();
            throw error;

        }

    }

    async rollback() {

        while (this._pool.length) {

            let { record, argv } = this._pool.pop();

            try {

                await record.rollback(...argv);

            } catch (error) {

                console.log(error);

            }

        }

    }

}

module.exports = Recorder;
