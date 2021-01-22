const express = require("express");
const file_upload = require("express-fileupload");
const path = require('path');
const app  = express();
const port = 3000;

app.use(file_upload());

app.get('/', (req, res) => {
    res.sendFile('client/index.html', {root: path.join(__dirname)} , (err) => {

    });
});

app.post('/upload', (req, res) => {
   let sampleFile;
   let uploadPath;

   // if(!res.files || Object.keys(req.files).length == 0){
   //     return res.status(400).send('No files were uploaded');
   // }
  console.log("incoming request from" + req.connection.remoteAddress);
   sampleFile = req.files.sampleFile;
   uploadPath = __dirname + '/tmp/' + req.connection.remoteAddress;

   sampleFile.mv(uploadPath, (err) => {
    if(err)
        return res.status(500).send(err);
    res.send('File uploaded');
   });

});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});

