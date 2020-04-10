'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CanvasSchema = new Schema({
    drawingHistorial: {type: Array},
});

module.exports = mongoose.model('Canvas', CanvasSchema);