# Client Object
---
## Object carried from begining to end of a client request. It wraps the request and response streams.

``ClientObject.debug ()``
Useful method that will close the response object after sending **this** to the client formatted as a JSON.

``ClientObject.hasRight (rightName)``
* **rightName** Name without spaces of a right to check
* *returns* Boolean; true if current user has the right passed as first parameter

``ClientObject.refuse ()``
Quick play to send a 403 response, then close response stream.

``ClientObject.sendJSON (object)``
* **object** Object or stringified JSON to be sent to client; 
The response stream will be automatically closed after sending the JSON

``ClientObject.touch (string)``
* **string** String representing the current method scope
Useful to keep track of a ClientObject. All the pushed *touch* can be sent to the client using *this.debug()*

``ClientObject.isLoggedIn ()``
* *returns* A boolean; true if current requester is a logged in user

``ClientObject.redirect (newURL, permanent, hash)``
* **newURL** URL to which the requester should be redirected
* **permanent** A boolean; true wil send a 301 instead of a 302
* **hash** Portion of the URL after the \# 

``ClientObject.crash ()``
Will send a 500 page to the current client

``ClientObject.throwHTTP (code, message, hard)``
* **code** HTTP code to be sent
* **message** Text or document to be sent; ignored if *hard* parameter is true
* **hard** A boolean; a hard response does not contain any message

``ClientObject.request``
Request object created by NodeJS HTTP module

``ClientObject.response``
Response object created by NodeJS HTTP module

``ClientObject.method``
Method of current request, in capital letters

``ClientObject.routeinfo``
Various information about the current route.
* **ClientObject.routeinfo.isStatic** A boolean; true if requesting a static file
* **ClientObject.routeinfo.params** An object representing the query parameters in URL
* **ClientObject.routeinfo.path** An array of strings representing the different levels in URL split by /
* **ClientObject.routeinfo.fullpath** String representing the URL fullpath

``ClientObject.postdata``
* **ClientObject.postdata.data** An object containing everything that was part of a POST request body
