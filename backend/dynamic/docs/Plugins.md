# Plugins
---
## Add-on logic on top of Lilium

### Creating a plugin
Plugins are located under the following directory : ~/plugins/

It needs at least two files in order to work properly.
* **info.json**
* **entry.js**

### The information JSON file
> The first file will contain the necessary information for Lilium to properly register the plugin. It requires two properties. 
```javascript
{
    "identifier" : "my-plugin",     // Identifier Name without spaces, must be the directory name
    "entry" : "myplugin.js"         // File instanciated by the plugin engin
}
```

## The Entry Javascript file
```javascript
class MyPlugin {
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

    loadHooks(_c) {
        // Add setting to settings page
        this.libs.hooks.bind('settings_form_bottom', 500, (pkg) => {
            pkg.form.add('plugin-title', 'title', {
                displayname : "My Plugin settings"
            }).add('myplugin_value', 'text', {
                displayname : "My plugin text value"
            });
        });

        // Hook on deep fetch, add value to article for theme access
        this.libs.hooks.bind('article_will_fetch', 500, (pkg) => {
            pkg.article.myPluginValue = pkg._c.myplugin_value;
        });
    }

    unregister(done) {
        // Unregister logic
        done();
    }

    register(siteConfig, pluginInfo, done) {
        this.loadLibraries(_c);
        this.loadHooks(_c);
    }  
}
```

> The entry script requires two methods implemented 

``MyPlugin.register( siteConfig, pluginInfo, done )``
* **siteConfig** Site information for which the plugin is enabled
* **pluginInfo** The plugin information JSON file as object
* **done** Method to call when everything is done

``MyPlugin.unregister( done )``
* **done** Method to call when everything is done
