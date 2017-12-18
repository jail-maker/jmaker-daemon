'use strict';

class RecordInterface {

    run() {}

    rollback() {}

}

class MountStep extends RecordInterface {

    run() {}

    rollback() {}

}

class Recorder {

    constructor() {

        this._pool = [];

    }

    run(record) {

        try {

            record.run();
            this._pool.push(record);

        } catch (e) {

            record.rollback();
            throw e;

        }

    }

    rollback () {

        this._pool.reverse();
        this._pool.forEach(rec => rec.rollback());

        this._pool = [];

    }

}
