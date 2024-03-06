# T2D Online Convert
Author: Chris Grams

A node.js web server to process uploaded .t2d files through org.proteomecommons.io.util.ConvertPeakList and return zip containing the resulting .mzxml/.txt files

The program can be run by running 

`node app.js`
        
## Requirements

From your package manager

- node (12.10.0+)
- zip 

npm dependencies
- express
- express-fileupload

## Notes
Note that the server runs on port 3000. Due to security reasons, node.js cannot run on lower numbered ports without superuser privileges. It's not a good idea to run this server using sudo. Thus, the outgoing port 80 should be routed to port 3000.

Example iptables routing         
`sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 3000`
