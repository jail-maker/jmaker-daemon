'use strict';

const Layers = require('./layers.js');
module.exports = Layers;

let layers = new Layers('jmaker');

console.log(layers.list());
