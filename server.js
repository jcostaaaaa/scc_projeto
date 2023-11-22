const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');


require('dotenv').config();

const uri = process.env.ATLAS_URI;
mongoose.Promise = global.Promise;
mongoose.connect(uri).then(() => { 
    console.log("Successfully connected to MongoDB.");
}).catch(err => {
    console.error("Connection error", err);
}) 
  

//Model

// Midleware
const app = express();
app.use('/', express.static(path.join(__dirname, 'static')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false })); //parse application/x-www-form-urlencoded


// routes
app.use('/user', require('./src/routes/authRoutes'));

// documentation
app.use('/apidocjs', express.static(path.join(__dirname, 'apidoc')));


let port=9999;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    
})