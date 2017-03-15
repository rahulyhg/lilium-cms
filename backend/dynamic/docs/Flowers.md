# Flowers
---
## Frontend website creation, endpoint and configuration

### Creating a theme
Themes are located under the following directory : ~/flowers/

It needs at least two files in order to work properly.
* **info.json**
* **entry.js**

### The information JSON file
> The first file will contain the necessary information for Lilium to properly register the theme. It requires five properties. 
```javascript
{
    "uName" : "my-theme",   // Identifier Name without spaces, must be the directory name
    "dName" : "My Theme",   // Display Name
    "entry": "entry.js",    // File instanciated by the theme engine
    "contexts" : {          // LML Files to compile depending on context
        "article" : "article.lml",
        "home" : "homepage.lml",
        "search" : "seek.lml",
        "404" : "notfound.lml",
        "styledpage" : "page.lml"
    },
    "settingForm" : {       // Configurations available from settings form
        "logo" : {"type" : "text", "attr" : {"displayname" : "Logo"}, "default" : "/static/media/lmllogo.png"},
        "headercolor" : {"type" : "text", "attr" : {"displayname" : "Header Color"}, "default" : "#EFEFEF"},
        "copyright" : {"type" : "text", "attr" : {"displayname" : "Copyright"}, "default" : "My Theme inc."}
    }
}
```

The *entry* property can be changed to another file name for convenience. 

## The Entry Javascript file
```javascript
class MyTheme {
    constructor() {
        this.libs = {};
    }

    loadLibraries(_c) {
        this.libs.endpoints = require(_c.server.base + "endpoints.js");
        this.libs.filelogic = require(_c.server.base + "filelogic.js");
        this.libs.hooks = require(_c.server.base + "hooks.js");
        this.libs.db = require(_c.server.base + "includes/db.js");
        this.libs.templateBuilder = require(_c.server.base + "templateBuilder.js");
    }

    loadEndpoints(_c) {
        // Homepage
        const theme = this.
        this.libs.endpoints.register(_c.id, '', 'GET', (cli) => {
            const homecontext = "home";

            theme.libs.db.findToArray(_c, 'content', {status : "published"}, (err, articles) {
                theme.libs.filelogic.renderThemeLML(_c, homecontext, 'index.html', {
                    config : _c, 
                    articles : articles,
                    error : err
                });
            });
        });
    }

    registerFrontendFiles(_c, info) {
        const themePath = _c.server.base + "flowers/" + info.uName;

        this.libs.templateBuilder.addCSS(themePath + "/css/style.css");
        this.libs.templateBuilder.addJS(themePath + "/js/scripts.js");
    }

    enable(_c, info, done) {
        this.loadLibraries(_c);
        this.loadEndpoints(_c);
        this.registerFrontendFiles(_c, info);
    }

    disable(done) {
        // Disable logic
    }
}

// Make sure to not instanciate the theme object.
// Only the class must be exported, not an instance of the class.
module.exports = MyTheme;
```

> The entry script requires two methods implemented 

``MyTheme.enable( siteConfig, themeInfo, done )``
* **siteConfig** Site information for which the theme is enabled
* **themeInfo** The theme information JSON file as object
* **done** Method to call when everything is done

``MyTheme.disable( done )``
* **done** Method to call when everything is done
