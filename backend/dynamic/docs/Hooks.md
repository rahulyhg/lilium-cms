# Hooks 
---
## Functions called during specific events, in priority order

``hooks.register (eventName, priority, action)``
* **eventName** Event identifier
* **priority** Number; lower numbers are executed first
* **action** Called when event *eventName* is fired

``hooks.fire (eventName, params)``
* **eventName** Event identifier
* **params** Object sent to all registered actions as a sole parameter

```javascript
var hooks = require('./hooks.js');
var endpoints = require('./endpoints.js');

hooks.register('textReceived', 20, (data) => {
    console.log(data.text);
});

endpoints.register('*', 'sendtext', 'POST', (cli) => {
    let pdata = cli.postdata.data;
    if (pdata.text) {
        hooks.fire('textReceived', pdata);
        cli.sendJSON(pdata);
    } else {
        cli.throwHTTP(401, undefined, hard);
    }
});
```
> The previous module will register the *POST/sendtext* endpoint.
> Upon receiving POST data, it will fire the *textReceived* event, which will be caught. The received text will output in the console. 
