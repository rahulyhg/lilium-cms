# Endpoints
---
## Handlers for special URLs

> An endpoint is represented by the first part after the root URL. It can be registered with a callback to handle a request properly. 

``Endpoints.register( siteid, name, method, handler )``
* **siteid** The ID of a site, \* for all sites
* **name** The endpoint name to register
* **method** Either GET or POST
* **handler** Function called when endpoint is requested
The handler received a single parameter : a ClientObject

```javascript
const endpoints = require('./endpoints.js');
const db = require('./includes/db.js');

// Register the information endpoint
endpoints.register('*', 'information', 'GET', (cli) => {
    db.findToArray(cli._c, 'information', {}, (err, infoArr) => {
        if (err) {
            console.log("Error at information endpoint : " + err);
            cli.throwHTTP(500, undefined, true);
        } else {
            filelogic.renderThemeLML(cli, 'page', 'information.html', {
                config : cli._c, 
                information : infoArr
            });
        }
    });
});
```

``Endpoints.execute( name, method, ClientObject)``
* **name** Endpoint name
* **method** Either GET or POST
* **ClientObject** An instance of ClientObject

``Endpoints.isRegistered( siteid, name, method )``
* **siteid** The ID of a site, will not accept a wildcard
* **name** Endpoint name
* **method** Either GET or POST


