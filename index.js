#!/usr/bin/env node

const yaml = require('js-yaml');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

const port = 3346;
const host = '0.0.0.0';

app.post('/jails', (req, res) => {

    console.log(req.body);
    res.send();

});

app.listen(port, host, () => {
    console.log(`listening on port ${port}!`);
});
