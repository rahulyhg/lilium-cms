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
			for (var i = events[eventName].length - 1; i >= 0; i--) {
				if (events[eventName][i](
					typeof params === 'undefined' ? undefined : params
				)) {
					break;
				}
			}
		}
	};
};

module.exports = new Hooks();
