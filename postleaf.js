var log = require('./log.js');
var livevars = require('./livevars.js');
var hooks = require('./hooks.js');

var _registeredPostLeaves = new Array();

// AKA Post interactive feature
var PostLeaf = function() {
    this.registerLeaf = function(leafname, leafDisplayname, backendScript, frontendScript) {
        _registeredPostLeaves.push({
            name : leafname,
            displayname : leafDisplayname, 
            backend : backendScript, 
            frontend : frontendScript
        });
    };

    this.registerLiveVar = function() {
        livevars.registerLiveVariable('postleaf', function(cli, levels, params, callback) {
            callback(_registeredPostLeaves[cli._c.id]);
        });
    };

    this.loadHooks = function() {
        hooks.bind('post_create_postleaf', 10, function(pkg) {
            for (var i = 0; i < _registeredPostLeaves.length; i++) {
                var pl = _registeredPostLeaves[i];

                pkg.form.add('create-postleaf-' + pl.name, 'button', {
                    displayname : "Add " + pl.displayname,
                    onclick : pl.backend
                });
            }
        });
    };
};

module.exports = new PostLeaf();
