#!/usr/bin/env node

'use strict';

const url = require('url');
const WebSocket = require('ws');

const Channel = require('./libs/channel.js');

const wss = new WebSocket.Server({ port: 3347 });

wss.on('connection', (ws, req) => {

    const location = url.parse(req.url, true);

    ws.on('message', name => {

        name = `jmaker:log:${name}`;
        let channel = new Channel(name);
        let messageListener = (name, message) => {

            let temp = JSON.parse(message);
            ws.send(message);
            if (temp.last) ws.close();

        };

        channel.subscribe(messageListener);

        ws.on('close', _ => channel.close());

    });

});
