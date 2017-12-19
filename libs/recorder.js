'use strict';

class Recorder {

    constructor() {

        this._pool = [];

    }

    async run(record, allRollback = true) {

        try {

            await record.run();
            this._pool.push(record);

        } catch (error) {

            await record.rollback();
            if (allRollback) await this.rollback();
            throw error;

        }

    }

    async rollback() {

        while (this._pool.length) {

            let rec = this._pool.pop();

            try {

                await rec.rollback();

            } catch (error) {

                console.log(error);

            }

        }

    }

}

module.exports = Recorder;
