# Lilium Dataserver
The Dataserver opens a simple authentication API to let users login using a token. It uses a local port and must be set up behind a local proxy.

## The API
| Method    | Endpoint          | Usage                                                                                                 |
| --------- | ----------------- | ----------------------------------------------------------------------------------------------------- | 
| POST      | /introduce        | Exchange a Facebook token for a Lilium token. Returns user information.                               |
| DELETE    | /introduce        | Destroys a session. Should be followed by a redirection to the login screen.                          |
| GET       | /me               | Returns the current user if logged in, 404 otherwise.                                                 |
| PUT       | /me               | Not yet implemented 501.                                                                              |
| DELETE    | /me               | Destroys a user session and erases it from the database (GDPR...)                                     |
| GET       | /fav              | Returns a list of saved articles.                                                                     |
| POST      | /fav              | Adds an article to the list of favourite. Article ID should be provided with the “cid” HTTP header.   |
| DELETE    | /fav              | Removes an article from favourites. Article ID should be provided with the “cid” HTTP header.         | 
| PUT       | /pref             | Updated the user preferences for custom homepage. More about this later.                              | 
| GET       | /search           | Returns a list of article related to a query provided as the HTTP header “terms”.                     |
| GET       | /all              | Returns the complete list of the latest posts.                                                        | 
| GET       | /content/id       | Returns a single full article with the provided id.                                                   |
| GET       | /author/id        | Returns a list of posts written by the author with the provided id.                                   |

## Configurations
The dataserver will be linked with a website if its configuration contains the following.
```json
{
    "dataserver" : {
        "active" : true,
        "port" : 19502
    }
}
```

## Login with Facebook
To support Facebook login, the following configuration is necessary.
```json
{
    "dataserver" : {
        "facebook" : {
            "v" : 3.0,
            "token" : "FACEBOOK_TOKEN"
        }
    }
}
```