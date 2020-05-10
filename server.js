// server.js
// where your node app starts

// include modules
const express = require('express');

const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');

//Generate random alphanumeric string of 22 characters
//Source: stack overflow, https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
function generatePostcardID() {
   var postcardID           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < 22; i++ ) {
      postcardID += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return postcardID;
}


let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname+'/images')    
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
// let upload = multer({dest: __dirname+"/assets"});
let upload = multer({storage: storage});


// begin constructing the server pipeline
const app = express();

const sql = require("sqlite3").verbose();

// This creates an interface to the file if it already exists, and makes the 
// file if it does not. 
const postcardDB = new sql.Database("postcards.db");

// Actual table creation; only runs if "postcards.db" is not found or empty
// Does the database table exist?
let cmd = " SELECT name FROM sqlite_master WHERE type='table' AND name='PostcardTable' ";
postcardDB.get(cmd, function (err, val) {
    console.log(err, val);
    if (val == undefined) {
        console.log("No postcard database file - creating one");
        createPostcardsDB();
    } else {
        console.log("Postcard Database file found");
    }
});

function createPostcardsDB() {
  // explicitly declaring the rowIdNum protects rowids from changing if the 
  // table is compacted; not an issue here, but good practice
  const cmd = 'CREATE TABLE PostcardTable ( rowIdNum TEXT PRIMARY KEY, image TEXT, color TEXT, font TEXT, message TEXT)';
  postcardDB.run(cmd, function(err, val) {
    if (err) {
      console.log("Postcard Database creation failure",err.message);
    } else {
      console.log("Created postcard database");
    }
  });
}



// Serve static files out of public directory
app.use(express.static('public'));

// Also serve static files out of /images
app.use("/images",express.static('images'));

// Handle GET request to base URL with no other route specified
// by sending creator.html, the main page of the app
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/public/creator.html');
});

// Next, the the two POST AJAX queries

// Handle a post request to upload an image. 
app.post('/upload', upload.single('newImage'), function (request, response) {
  console.log("Recieved",request.file.originalname,request.file.size,"bytes")
  if(request.file) {
    // file is automatically stored in /images, 
    // even though we can't see it. 
    // We set this up when configuring multer
    response.end("recieved "+request.file.originalname);
  }
  else throw 'error';
});


// Handle a post request containing JSON
app.use(bodyParser.json());
// gets JSON data into req.body
app.post('/saveDisplay', function (req, res) {
  console.log(req.body);
  // write the JSON into postcardData.json
  fs.writeFile(__dirname + '/public/postcardData.json', JSON.stringify(req.body), (err) => {
    if(err) {
      res.status(404).send('postcard not saved');
    } else {
      res.send("All well")
    }
  })
  
  let rowIdNum = generatePostcardID();
  let image= req.body.image;
  let color = req.body.color;
  let font = req.body.font;
  let message = req.body.message;
  console.log("image",image, "color", color, "font", font, "message", message);
  
  // put new item into database
  cmd = "INSERT INTO PostcardTable ( rowIdNum, image, color, font, message) VALUES (?,?,?,?,?) ";
  postcardDB.run(cmd, rowIdNum, image, color, font, message, function(err) {
    if (err) {
      console.log("DB insert error",err.message);
      //next();
    } else {
      let newId = this.lastID; // the rowid of last inserted item
      res.send("Got new item, inserted with rowID: "+ rowIdNum);
    }
  }); // callback, postcardDB.run
  
});


// The GET AJAX query is handled by the static server, since the 
// file postcardData.json is stored in /public

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
