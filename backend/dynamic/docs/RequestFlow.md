# Request Flow
---
## Client Object complete flow from request handling to response

The Inbound module is created inside the Core file. It uses the NodeJS module **http**, and will create a new ClientObject instance for every request received. 
When the request is received, a hook is fired named **request**.

> The ClientObject is carried from the first to the last function. Since it contains the request, response, and current website config, it is crucial to always keep it close. 

### Handling the request

* **Inbound -> handleReq**
* **new ClientObject(request, response)**
* **Handler.handle(cli)**
* **cli.bindEnd**
* *Handler -> parseMethod(cli)*

> The request will fork to either the **GET** function or the **POST** one depending on the request method.
> Both will execute the same logic for filling ClientObject information. 

### GET

* **Router.parseClientObject(cli)**
* **Config.fetchConfigFromCli(cli)**
* **Session.injectSessionInCli(cli)**
* *Dispatcher.dispatch(cli)*

> The dispatched will send the ClientObject to a proper handler depending on the situation. 

#### GET > Requesting a static file
* **HTMLServer.serveStatic(cli)**
* **FileServer.pipeFileToClient(cli)**

#### GET > Requesting a URL passed /admin
* **Admin.serveDashboard(cli)**
* *Admin.handleAdminEndpoint(cli)*

#### GET > /admin > If no async parameter is found
* **FileLogic.serveAdminTemplate(cli)**

#### GET > /admin > Else, execute an existing admin endpoint
* **Admin.executeEndpoint(cli)**

#### GET > Requesting the login page
* **Admin.serveLogin(cli)**
* **FileLogic.runLogic(cli)**

#### GET > Requesting the API endpoint
* **API.serveApi(cli)**

#### GET > Requesting the Livevars endpoint
* **Livevars.handleRequest(cli)**

#### GET > Requesting an existing endpoint
* **Endpoints.execute(cli.routeinfo.path[0], 'GET', cli)**

#### GET > Falling back to basic logic
* **HTMLServer.serveClient(cli)**
* **StyledPages.serveOrFallback(cli)**
* **Article.generateFromName(cli, slug)**
* **FileLogic.renderThemeLML(cli)**
* **FileServer.pipeFileToClient(cli)**

### POST
> All data sent from client using the *POST* is stored in the ClientObject by the dispatcher
* **Router.parseClientObject(cli)**
* **Config.fetchConfigFromCli(cli)**
* **Session.injectSessionInCli(cli)**
* **Dispatcher.dispost(cli)**

> Data is contained under *ClientObject.postdata.data*.
> The ClientObject is then sent to a registered endpoint if it was registered.
* **Endpoints.execute(cli.routeinfo.path[0], 'POST', cli)**
