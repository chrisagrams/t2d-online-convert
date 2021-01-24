/*  t2d-online-convert
    Author: Chris Grams
    ===================

    A node.js web server to process uploaded .t2d files through org.proteomecommons.io.util.ConvertPeakList and return zip
    containing the resulting .mzxml/.txt files

    The program can be run by running
        "node app.js"

    Requirements:
        From your package manager:
            node (12.10.0+), zip
        npm dependencies:
            express
            express-fileupload

    Note that the server runs on port 3000. Due to security reasons, node.js cannot run on lower numbered ports without superuser privileges.
    It's not a good idea to run this server using sudo. Thus, the outgoing port 80 should be routed to port 3000.
    Example iptables routing:
        "sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 3000"
 */

/* Setup
        - express:            This package handles all of the http requests and responses.
        - express-fileupload: This package handles file uploads within requests.
        - path:               This package handles system and relative paths.
        - fs:                 This package handles all filesystem operations.
        - {exec}:             This package handles the execution of other processes within the server.
        - app:                Initiating express.
        - port:               Represents the port the server will be utilizing.
 */

const express = require("express");
const file_upload = require("express-fileupload");
const path = require('path');
const fs = require('fs');
const {exec} = require("child_process");
const app  = express();
const port = 3000;

app.use(express.static(__dirname + '/client/')); /* See app.get() below */
app.use(file_upload(undefined));

/* app.get() - Function
        - Description: Handles requests for "/" and replies with index.html and styles.css.
        - Options:     "root: path.join(__dirname)" - These options combined with the options in express.static allow the entirety of
                                                      the client folder to be sent out without exposing other directories.
                                                      Thus, tmp folder should not be accessible to anyone but the server itself.
                                                      The server will send the resulting files directly to the client and no one else.
*/

app.get('/', (req, res) => {
        res.sendFile('client/index.html', {root: path.join(__dirname)} , (err) => {
    });
});

/* app.post() - Function
        - Description: The meat of the server. This function responds to form requests made at http://localhost:3000/upload and
                       proceeds to extract the files, convert them, zip them up, then send the resulting zip back to the client.
                       Also calls the cleanup to make sure nothing gets left behind after a client is done.
        - Output:      Internal: None. Should leave nothing behind.
                       External: Sends zip to client.
 */

app.post('/upload', (req, res) => {

    /* Variables
        - file:          Represents the currently selected file.
        - uploadPath:    Represents the destination upload path. (ie: /tmp/remoteAddress/)
        - remoteAddress: Represents the IP address of client making the current request.
     */

    let file;
    let uploadPath;
    let remoteAddress = req.connection.remoteAddress;

    /* if(!req.files || Object.keys(req.files).length === 0) - Comparison
            - Description:                Initial check to see if client sent files within its request.
            - Case 1, there are files:    Do nothing.
            - Case 2, there are no files: Print to console error and respond with code 400.
     */

    if(!req.files || Object.keys(req.files).length === 0){
        console.log("|("+ remoteAddress +")> " + "No valid files uploaded, terminating session.");
        return res.status(400).send('No valid files were uploaded');
    }
    console.log("Incoming request from" + remoteAddress);

    /* if(!fs.existsSync()) - Comparison
            - Description:                      *SYNCHRONOUS* method that checks if the requested directory exists or not before creating a directory.
                                                This should always result to true if cleanup works properly.
            - Case 1, directory exits:          Do nothing. (shouldn't happen)
            - Case 2, directory does not exist: Create the temporary directory for remoteAddress.
     */

    if (!fs.existsSync("./tmp/"+ remoteAddress)){
        fs.mkdirSync("./tmp/"+ remoteAddress);
        console.log("|("+ remoteAddress +")> " + "Directory made.");
    }

    file = req.files.file;  /* Select file from request */

    /* if(!file) - Comparison
            - Description:              Check if the file within the request is not null.
            - Case 1, file is null:     Print to console error and respond with code 500.
            - Case 2, file is not null: Do nothing.
     */

    if(!file){
        console.log("|("+ remoteAddress +")> " + "Internal Server Error, not a file. Terminating session.");
        return res.status(500).send("Internal Server Error");
    }

    /* Array.isArray(file) - Comparison
            - Description:            Checking if the file object selected from the request is a singular object or an array.
            - Case 1, it is an array: Iterate through the array and convert each file individually in out directory.
            - Case 2, not an array:   Proceed to treat the object as a file and convert the file and zip it.
     */

    if(Array.isArray(file)) {
        let counter = 0;
        file.forEach( e => {
            uploadPath = __dirname + '/tmp/' + remoteAddress + "/" + e.name;
            e.mv(uploadPath, (err) => {
                if(err)
                    return res.status(500).send(err);
            });
            counter++;
        });
        return res.send(counter + ' Files uploaded');
    }
    else {
        uploadPath = __dirname + '/tmp/' + remoteAddress  + "/" + req.files.file.name;

        /* file.mv - Function
                - Goal:   Move file to uploadPath.
                - Output: If theres an error, print to console and respond with code 500.
         */

        file.mv(uploadPath, (err) => {
        if(err) {
            console.log("|("+ remoteAddress +")> " + "error: " + err + "\nTerminating session.");
            return res.status(500).send(err);
        }

        /* javaExec - Call to exec
                - Goal:         Execute `java ConvertPeakList -merge`.
                - Result:       Will output result in '/tmp/remoteAddress/out/filename.mzxml\txt'.
                - Sample calls: `java org.proteomecommons.io.util.ConvertPeakList -merge "AA01_MSMS_1500.0000_1.t2d" "AA.mzxml"`
                                `java org.proteomecommons.io.util.ConvertPeakList -merge "AA01_MSMS_1500.0000_1.t2d" "AA.txt"`
         */

        let javaExec = exec('java org.proteomecommons.io.util.ConvertPeakList -merge "'+ uploadPath+ '" "tmp/' + remoteAddress +'/out/'+req.files.file.name+'.mzxml"',
            (error, stdout, stderr) => { return stdoutput(res, req, error, stdout,stderr)});

        /* javaExec.on - Event Listener
            - Trigger: Triggered once java exec finishes execution.
            - Result:  Will zip and send file, then cleanup temporary directory.
         */

        javaExec.on("exit", () => {
            console.log("|("+ remoteAddress +")> " + "Conversion finished. Zipping...");

            /* zipExec - Call to exec
                    - Goal:         Zips the output directory containing resulting .mzxml/.txt files.
                    - Parameters:   -r (recursive) -j (ignore directory structure)
                    - Sample call:  "zip -r -j zipFilename tmp/remoteAddress/out/"
                    - Return value: Sends output to stdoutput() to send correct header response and output to console.
             */

            let zipFilename = 'tmp/' + remoteAddress + '/' + Date.now() + remoteAddress+'out.zip';
            let zipExec = exec('zip -r -j '+ zipFilename +' tmp/' + remoteAddress +'/out/',
                (error, stdout, stderr) => { return stdoutput(res, req, error, stdout,stderr)});

                /* zipExec.on - Event Listener
                       - Trigger: Triggered once the "zip" program finishes executing.
                       - Result:  Will setup res.on() and call res.download.
                 */

                zipExec.on('exit', () => {
                    console.log("|("+ remoteAddress +")> " + "Zipping finished. Returning download.");

                    /* res.on - Event Listener
                        - Trigger: This event handler is triggered once the session is closed,
                                   meaning the download has been sent out to the client.
                        - Result:  Removes temporary directory named after remoteAddress and
                                   all files stored within this directory (including the resulting zip).
                     */

                    res.on('finish', (e) => {
                        console.log("|("+ remoteAddress +")> " + "File sent. Starting cleanup...");
                        fs.rmdirSync(__dirname + '/tmp/' + remoteAddress + '/', { recursive: true });
                        console.log("|("+ remoteAddress +")> "+ "Cleanup done. Session closed.")
                    });

                    /* res.download - Function
                        - Calling: Once zipExec is triggered.
                        - Result:  Sends the zip file as a response to http request.
                                   Includes "Content-Disposition: attachment" in
                                   response headers.
                     */
                    return res.download(zipFilename);

                });
             });
        });
    }
});

/* app.listen - Function
    Description - Setup the server to be listening for requests on port 3000.
 */

app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
});

/* stdoutput - Function
    Description - Handles all output from exec calls and handles error messages
                  by printing to console and responding with code 500.
 */

const stdoutput = (res, req, error, stdout, stderr) => {
    if(error) {
        console.log("|("+ req.connection.remoteAddress +")> " + "error: " + error.message);
        return res.status(500).send(error);
    }
    if(stderr) {
        console.log("|("+ req.connection.remoteAddress +")> " + "stderr: " + stderr);
        return res.status(500).send(stderr);
    }
}