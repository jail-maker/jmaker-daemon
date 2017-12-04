#!/usr/bin/env node

'use strict';

const path = require('path');
const url = require('url');
const http = require('http');
const WebSocket = require('ws');

const Channel = require('./libs/channel.js');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {

    const location = url.parse(req.url, true);

    console.log('------------->');

    ws.on('close', _ => console.log('ws is closed'));

    ws.on('message', name => {

        console.log('<-------------');

        name = `jmaker:log:${name}`;

        let channel = new Channel(name);

        let messageListener = (name, message) => {

            console.log('!!!!!!');
            ws.send(message);

        };

        channel.subscribe(messageListener);

        channel.on('close', () => {

            ws.close();

        });

    });

});
