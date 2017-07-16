# Live Variables
---
## A special endpoint meant to serve live, non-cached data

``livevars.registerLiveVariable (name, action, requiredRights)``
* **name** Endpoint top-level name
* **action** Function called handling the livevariable request
* **requiredRights** Array of rights; User must meet all of them to execute the live variable

```javascript
const livevars = require('./livevars.js');
const db = require('./includes/db.js');

livevars.registerLiveVariable('information', (cli, levels, params, send) => {
    const subinfo = levels[0];
    if (!subinfo) {
        send(new Error("Information live variable needs a specific sub-category"));
    } else {
        db.findUnique(cli._c, 'information', {subcategory : subinfo}, (err, arr) => {
            if (err) {
                send(err);
            } else {
                send({
                    subcategory : subinfo,
                    information : arr
                });
            }
        });
    }
});
```

The provided action receives 4 parameters
``livevarAction(clientobject, levels, params, send)``
* **clientobject** ClientObject instance representing the requester
* **levels** Array containing all URL levels after the live variable endpoint
* **params** Object containing various parameters sent by the client
* **send** A function to be called when ready to send data; only required parameter is the data to be sent

Live variables are executed from the markup as special tags ressembling the following
```javascript
<lml-livevars data-varname="information.apidoc" data-varparam="{}"></livevars>
```

> This special markup will be picked up by the Lilium frontend engine which will add the previously defined livevar to the one-time request. All livevars will be queried inside a single request, and their responses will be stored inside the *liliumcms.livevars* global object.
> The live variables can then be accessed from the frontend. 

### In LML
In order to make things a little quicker and easier, it is recommended to use LML to add live variables to a page. The syntax is the following : 
```javascript
{*livevarendpoint.firstlevel.secondlevel(params)}
```

The previous LML code will output a live variable tag to be picked up by the frontend engine. The syntax is pretty simple. Between curly braces, start with an asterisk, then the top-level name followed by other levels. Parameters are optional and parentheses can be omitted.
