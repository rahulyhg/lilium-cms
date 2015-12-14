var events = {
	"load" : [],
	"request" : [],
	"clientobject" : [],
	"dispatch" : [],
	"redirect" : [],
	"postdata" : [],
	"login" : [],
	"logout" : [],
	"lmlstart" : [],
	"lmlinclude" : [],
	"endpoints" : []
};

var Hooks = function() {
	this.bind = function(eventName, callback) {
		if (typeof events[eventName] === 'undefined') {
			events[eventName] = [];
		}

		events[eventName].push(callback);
	};

	this.trigger = this.fire = function(eventName, params) {
		if (typeof events[eventName] !== 'undefined') {
			for (var i = 0, len = events[eventName].length; i < len; i++) {
				events[eventName][i](
					typeof params === 'undefined' ? undefined : params
				);
			}
		}
	};
};

module.exports = new Hooks();
