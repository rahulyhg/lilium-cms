# Lilium Markup Language
---
## An easy way to generate HTML while avoiding spaghetti code

``LML2.compile (siteid, content, stream, extra, done)``
* **siteid** Website id, always contained in ClientObject.\_c.id
* **content** String containing LML 
* **stream** WritableStream in which the compiled code will be written
* **extra** Object containing objects to be accessed from the LML files
* **done** Called when compilation is done

> If method LML2.compileToString is used, no stream must be passed

``LML2.compileToString (siteid, content, extra, done)``
* **siteid** Website id, always contained in ClientObject.\_c.id
* **content** String containing LML 
* **extra** Object containing objects to be accessed from the LML files
* **done** Called when compilation is done; first parameter is the compiled LML as string

> Everything passed using the *extra* parameter will be accessible inside the markup while compiling. For instance, when compiling an article, it will be contained in extra.article

### Inside the markup
Let the following be executed
```javascript
const LML2 = require("./lml/compiler.js");
const endpoints = require('./endpoints.js');
const fileserver = require('./fileserver.js');
const db = require('./includes/db.js');

const handleRequest = (cli) => {
    let filePath = cli._c.server.base + "backend/dynamic/information.lml";
    
    // Get information from database
    db.findToArray(cli._c, 'information', {}, (err, infoArr) => {
        if (err) {
            cli.throwHTTP(404, undefined, true);
        } else {
            // Read LML file
            fileserver.readFile(filePath, (contentToCompile) => {

                // Compile LML File, passing information array as extra
                LML2.compile(cli._c, contentToCompile, cli.response, {
                    config : _c,
                    information : infoArr
                }, (lmlContext) => {
                    cli.response.end();
                });
            });
        }
    });
};

endpoints.register('*', 'information', 'GET', handleRequest);
```

> The previous code will receive requests to the endpoint */information*, will compile a LML file, and will send the compiled code to the client. Please note that calling *LML.compile* with a stream will note close the stream when done.

### The markup

Let's take a look at the compiled LML file
```
{#config;extra}
<h1>All information</h1>
<div id="info-list-wrapper">
    <ul>
        {$ for (var info in extra.information); $}
            <li>{=info.displayname}</li>
        {$ endfor; $}
    </ul>

    <a href="{=config.default.server.url}/">Return to home page</a>
</div>
```

This example will display a list of all the items inside the *infoArr* returned by mongo in the request handling logic. 

### The syntax

> There are 5 different tags that can be used
* **Library registration** {#library}
* **Petal file inclusion** {%petalfile}
* **Live Variable** {*livevar}
* **Flush tag** {=variable}
* **LML Slang** {$ if (var == 10); $}

The 4 first tags can take different flags to customize the output. Flags are added after the first identifier of an LML tag. For instance 
```
{=?&variable}
```
The previous tag is a flush tag since its identifier is "=", but it has the "?" and "&" flag since they follow the identifier. 

#### Library registration

Registering a library will make it accessible from the markup. The syntax is the following : 
```
{#config;extra;article}
```
> Multiple libraries can be registered on one line if they are split with a semi-colon

#### Petal file inclusion

It is possible to compile and include the compiled markup of another file using .petal files.
```
{%petalfile}
``` 

LML will search for a petal file named *petalfile.petal* inside the same directory as the LML one. Possible flags are
* **=** Will use a variable name as the petal file
* **%** Will skip compilation and simply insert a plain text petal file

If no file is found, LML will check is a global Petal file was registered.

#### Live Variable
```
{*livevarendpoint}
{*information.getall}
{*myendpoint(max:10)}
```

Live variable tags will output a special HTML tag representing a live variable to be requested on page load. Live variable tags take no flags, and the parameters are optional.

The following live variable will call the endpoint called "lvendpoint" with two levels : "get" and "latest". It will also have a parameter called "max" with a value of 25.
```
{*lvendpoint.get.latest(max:25)}
```

From the backend, the live variable will be accessed like so
```javascript
require('./livevars.js').registerLiveVariable('lvendpoint', (cli, levels, params, send) => {
    levels  // [ "get", "latest" ]
    params  // { max : 10 }
});
```

#### Flush tag
Flush tags will simply output a variable inside the content. It can have three flags.
* **?** Will output no error if the variable is undefined
* **&** Will encode the HTML 
* **#** Will stringify the output if it's an object

Usage :
```
{#extra}
<h1>{=&extra.article.title}</h1>
<h2>{=&extra.article.subtitle}</h2>

<span>{=?&extra.article.category}</span>

<script>
    var articleTags = {=#extra.article.tags};
</script>
```

Would output
```
<h1>My article</h1>
<h2>With an amazing subtitle</h2>

<span>John Smith</span>

<script>
    var articleTags = ["first", "articles", "geeks"];
</script>
```

#### LML Slang

Lilium Markup Language Slang ressembles classic Javascript, lets you create loops and do simple arithmetic operations.

> All LML Slang blocks must start with {$ and finish with $}
> LML Slang operations and blocks must finish by a semi-colon, even the conditions and loops

In the following example, an array of articles was passed as an extra
```
{#config;extra}
{$
    var adminpanelurl = config.default.server.url;
    adminpanelurl += "/admin/article/edit/";
$}

<h1>My articles</h1>

{$ for (var article in extra.allarticles); $}
<div>
    <h2>
        <a href="{=config.default.server.url}/{=article.slug}">
            {=article.title}
        </a>
    </h2>
    {$ if (?article.image ??); $}
        <img src="{=article.image}" />
    {$ endif; $}

    <a href="{=adminpanelurl}/{=article._id}">Edit article</a>
</div>
{$ endfor; $}
```
> The previous code will output a list of articles with a link to read one, and an edit link that will redirect the user to the admin panel on the edit screen for an article.

LML Slang can use flags for variables too. In the previous example, we're using article.image with a "?" flag, meaning that if the variable is undefined, if will not crash and will return undefined instead.

The operator used afterwards "??" is a simply undefined checked. It will return true if the previous object exists. Another way to do this could be : 
```
    {$ if (?article.title != ""); $}
        <h1>{=article.title}</h1>
    {$ endif; $}
```

All blocks must also finish with a semi-colon. It is possible to chain as many LML Slang operations as desired in the same closure. 


