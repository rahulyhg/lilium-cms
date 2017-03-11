# File Server
---
## File I/O management utility. The File Server acts as a wrapper of *fs*.

``fileserver.fileExists (fullpath, callback, sync)``

* **fullpath** Represents the full path of the file to check
* **callback** Function called with a boolean as the first parameter
* **sync** If set to true, the function will return a boolean and no callback will be executed

```javascript
const fileserver = require('./fileserver.js');
const endpoints = require('./endpoints.js');

endpoints.register('*', "information", "GET", (cli) => {
    const fullpath = cli._c.server.html + "information.html"

    fileserver.fileExists(fullpath, (exists) => {
        if (exists) {
            fileserver.pipeFileToClient(cli, fullpath, () => {
                console.log("Client served information page.");
            }, true, "text/html");
        } else {
            cli.throwHTTP(404);
        }
    });
});
```

``fileserver.dirExists (fullpath, callback)``
* **fullpath** Represents the full path of the directory to check
* **callback** Function called with a boolean as the first parameter

``fileserver.createSymLink (source, destination, callback)``
* **source** Full path of new symbolic link
* **destination** Full path of destination link
* **callback** Function called after creating the symbolic link

``fileserver.emptyDirectory (path, options, callback)``
* **path** Full path of the directory to empty
* **options** An object containing options
* **callback** Function called after emptying the directory

Position options are :
* fileFilter - String representing a filter to avoid deleting all files, defaults to a wildcard \*


``fileserver.deleteFile (path, callback)``
* **path** Full path of file to be deleted
* **callback** Called after deleting the file

``fileserver.readJSON (path, callback, sync)``
* **path** Full path of JSON file to be read
* **callback** Called after reading and parsing JSON
* **sync** If set to true, will return the read JSON instead of calling back

``fileserver.saveJSON (path, object, callback)``
* **path** Full path to where to save the JSON file
* **object** Object which will be stringified
* **callback** Called when done

``fileserver.readFile (path, callback, sync, encoding)``
* **path** Full path to where to save the JSON file
* **callback** Called when done reading file; first parameter is file content, second is a possible error
* **sync** If set to true, will return the content of the file; won't fire callback
* **encoding** File encoding, defaults to *utf8*

``fileserver.listDirContent[Recursive] (path, callback)``
* **path** Full path of directory to query
* **callback** Called when done; first parameter is array of file, second is a possible error

``fileserver.copyFile (source, destination, callback)``
* **source** Full path of source file to copy
* **destination** Full path with file name of copied file
* **callback** Called when done copying file

``fileserver.moveFile (source, destination, callback)``
* **source** Full path of source file to move
* **destination** New destination for file
* **callback** Called when done moving file

``fileserver.pipeFileToClient (clientobject, filepath, callback, absolute, mime)``
* **clientobject** A Lilium instance of ClientObject
* **filepath** A full path to the file which will be sent to the client
* **callback** Called when socket with client is closed and file is sent
* **absolute** If true, the path will not include the relative portion
* **mime** Mime type, defaults to *text/html*

``fileserver.getOutputFileHandle (filename, flag, encoding)``
* **filename** Full path of a file to read
* **flag** Access flag; defaults to *a+* (append or create)
* **encoding** File encoding; defaults to *utf8*
* *returns* A file handle represented by a stream

```javascript
const fileserver = require('./fileserver.js');
const endpoints = require('./endpoints.js');

endpoints.register('*', "information", "POST", (cli) => {
    let newInformation = cli.postdata.data.newinfo;
    let infoid = cli.postdata.data.infoid;

    const fileHandle = fileserver.getOutputFileHandle(
        cli._c.server.html + "informations/" + infoid + ".info",
        "w+",
        "utf8"
    );

    fileHandle.write(newInformation, 'utf8', () => {
        fileHandle.end();
        cli.sendJSON({valid : true, infoid : infoid});
    });
});

```

``fileserver.pipeFileToHandle (wstream, fullpath, callback)``
* **wstream** WritableStream in which the file will be piped
* **fullpath** Full path of file to pipe to stream
* **callback** Called when done piping file

``fileserver.dumpToFile (filename, content, callback, encoding)``
* **filename** Full path of file in which to write content
* **content** String to be written in file
* **callback** Called when done writing file
* **encoding** File encoding; defaults to *utf8*

