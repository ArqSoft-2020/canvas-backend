'use strict';

const express = require('express'); 
const bodyParser = require('body-parser');
const http = require('http');
const sseMW = require('./sse');
const mongoose = require('mongoose');
const Canvas = require('./models/canvas');
const PORT = process.env.PORT || 3000;
const app = express();

app.listen(PORT, () => {
    console.log('Server running, listening at ' + PORT);
});

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

//Conection to DB
mongoose.connect('mongodb://localhost:27017/canvasDB', { 
        useNewUrlParser: true,
        useUnifiedTopology: true
    }, (err, res) => {
    if (err) console.log("Database connection error: " + err);
    console.log("Database connection successful");
});

//configure sseMW.sseMiddleware as function to get a stab at incoming requests
//in this case by adding a Connection property to the request
app.use(sseMW.sseMiddleware);

// Realtime updates
var sseClients = new sseMW.Topic();

app.get('/api/canvas/update', (req, res) => {
    var sseConnection = res.sseConnection;
    console.log("sseConnection specs= ");
    sseConnection.setup();
    sseClients.add(sseConnection);
});

var lastChange;
let updateSseClients = (data) => {
    this.lastChange = data;
    const thisArg = this;
    sseClients.forEach(function (sseConnection) {
        console.log(thisArg);
        console.log("send sse message global m " + JSON.stringify(thisArg.lastChange));
        sseConnection.send(thisArg.lastChange);
    }, thisArg);
};

app.post('/api/canvas/update', (req, res) => {
    let data = req.body;

    if (data.request_user_id == data.allowed_user_id){
        let drawingdata = {
            coord_x: data.coord_x,
            coord_y: data.coord_y,
            color_r: data.color_r,
            color_g: data.color_g,
            color_b: data.color_b,
            evt_type: data.evt_type,
        };
        updateSseClients(drawingdata);

        Canvas.findById(data.drawing_historial_id, (err, drawingHistorial) => {
            if (err) {
                res.status(500).send({
                    message: 'Server error at finding drawing historial: ' + err
                });
            } else if (!drawingHistorial) {
                res.status(404).send({
                    message: 'Canvas doesnt exist'
                });
            } else {
                if (data.evt_type == "drawing") {
                    drawingHistorial.drawingHistorial.push(drawingdata);
                } else {
                    drawingHistorial.drawingHistorial = [];
                }
                drawingHistorial.save((err, drawingHistorialUpdated) => {
                    if (err) {
                        res.status(500).send({
                            message: 'Canvas drawing historial update failed: ' + err
                        });
                    } else {
                        res.status(200).send({
                            message: 'Drawing historial successfuly updated',
                            canvas: drawingHistorialUpdated,
                        });
                    }
                });
            }
        });
    }else{
        res.status(403).send({
            message: 'User has no permissions'
        });
    }
    
});

app.get('/api/canvas/historial/:id', (req, res) => {
    let canvas_id = req.params.id;
    Canvas.findById(canvas_id, (err, drawingHistorial) => {
        if (err) {
            res.status(500).send({
                message: 'Server error at finding drawing historial: ' + err
            });
        } else if (!drawingHistorial) {
            res.status(404).send({
                message: 'Canvas doesnt exist'
            });
        } else {
            res.status(200).send({
                drawingHistorial,
            });
        }
    });
});

app.post('/api/canvas/historial', (req, res) => {
    let drawingHistorial = new Canvas();
    drawingHistorial.save((err, drawingHistorialStored) => {
        if (err) {
            res.status(500).send({
                message: 'Canvas drawing historial creation failed: ' + err
            });
        } else {
            res.status(200).send({
                message: 'Drawing historial successfuly created',
                canvas: drawingHistorialStored,
            });
        }
    });
});

app.delete('/api/canvas/historial/:id', (req, res) => {
    let canvas_id = req.params.id;
    Canvas.findById(canvas_id, (err, drawingHistorial) => {
        if (err) {
            res.status(500).send({
                message: 'Server error at finding drawing historial (delete): ' + err
            });
        } else if (!drawingHistorial) {
            res.status(404).send({
                message: 'Canvas doesnt exist'
            });
        } else {
            drawingHistorial.remove(err =>{
                if (err) {
                    res.status(500).send({
                        message: 'Server error at deleting drawing historial: ' + err
                    });
                } else {
                    res.status(200).send({
                        message: 'Drawing historial deleted'
                    });
                }
            });
        }
    });
});
