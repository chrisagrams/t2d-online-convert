const express = require("express");
const file_upload = require("express-fileupload");
const path = require('path');
const fs = require('fs');
const {exec} = require("child_process");
const app  = express();
const port = 3000;

app.use(express.static(__dirname + '/client/'));
app.use(file_upload());

app.get('/', (req, res) => {
    res.sendFile('client/index.html', {root: path.join(__dirname)} , (err) => {

    });
});

app.post('/upload', (req, res) => {
   let file;
   let uploadPath;

   if(!req.files || Object.keys(req.files).length == 0){
       console.log("|("+ req.connection.remoteAddress +")> " + "No valid files uploaded, terminating session.");
       return res.status(400).send('No valid files were uploaded');
   }
  console.log("Incoming request from" + req.connection.remoteAddress);

    if (!fs.existsSync("./tmp/"+ req.connection.remoteAddress)){
        fs.mkdirSync("./tmp/"+ req.connection.remoteAddress);
        console.log("|("+ req.connection.remoteAddress +")> " + "Directory made.");
    }
    file = req.files.file;
    if(!file){
        console.log("|("+ req.connection.remoteAddress +")> " + "Internal Server Error, not a file. Terminating session.");
        return res.status(500).send("Internal Server Error");
    }
    if(Array.isArray(file)) { //file is thus an array
        let counter = 0;
        file.forEach( e => {
            uploadPath = __dirname + '/tmp/' + req.connection.remoteAddress + "/" + e.name;
            e.mv(uploadPath, (err) => {
                if(err)
                    return res.status(500).send(err);
            });
            counter++;
        });
        return res.send(counter + ' Files uploaded');
    }
    else {
        uploadPath = __dirname + '/tmp/' + req.connection.remoteAddress  + "/" + req.files.file.name;
        file.mv(uploadPath, (err) => {
        if(err) {
            console.log("|("+ req.connection.remoteAddress +")> " + "error: " + err + "\nTerminating session.");
            return res.status(500).send(err);
        }
        let javaExec = exec('java org.proteomecommons.io.util.ConvertPeakList -merge "'+ uploadPath+ '" "tmp/' + req.connection.remoteAddress +'/out/'+req.files.file.name+'.mzxml"', (error, stdout, stderr) => {
            if(error) {
                console.log("|("+ req.connection.remoteAddress +")> " + "error: " + error.message);
                return res.status(500).send(error);
            }
            if(stderr) {
                console.log("|("+ req.connection.remoteAddress +")> " + "stderr: " + stderr);
                return res.status(500).send(stderr);
            }
        });

        javaExec.on("exit", () => {
            console.log("|("+ req.connection.remoteAddress +")> " + "Conversion finished. Zipping...");
            let zipFilename = 'tmp/' + req.connection.remoteAddress + '/' + Date.now() + req.connection.remoteAddress+'out.zip';
            let zipExec = exec('zip -r '+ zipFilename +' tmp/' +req.connection.remoteAddress +'/out/', (error, stdout, stderr) => {
                if(error) {
                    console.log("|("+ req.connection.remoteAddress +")> " + "error: " + error.message);
                    return res.status(500).send(error);
                }
                if(stderr) {
                    console.log("|("+ req.connection.remoteAddress +")> " + "stderr: " + stderr);
                    return res.status(500).send(stderr);
                }
            });

            // return res.send('File uploaded');
                zipExec.on('exit', () => {
                    console.log("|("+ req.connection.remoteAddress +")> " + "Zipping finished. Returning download.");
                    return res.download(zipFilename);
                });
             });
        });
    }
});

app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
});

