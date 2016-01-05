// Lilium Frontend core framework
// Requires vaniryk
var LiliumCMS = function() {
	var LiveVars = function() {
		var domElems;

		var VarRequest = function(domElems) {
			var endpoints = [];
			var url = "";

			this.get = function() {
				formatURL();
				
				_a.get(url, undefined, set);
			};

			var set = function(data) {
				console.log(JSON.stringify(data));
			};

			var formatURL = function() {
				url = window.location.host + "/livevars?";

				for (var i = 0; i < endpoints.length; i++) {
					url += (i==0?'':'&') + "vars=" + endpoints[i];
				}
			};

			var init = function(domElems) {
				domElems.all(function(velem) {
					endpoints.push(velem.data('varname'));
				});
			};
		
			init(domElems);
		};

		this.storeDOMElements = function() {
			domElems = _v('.liliumLiveVar');
		};

		this.exec = function() {
			this.storeDOMElements();
	
			var req = new VarRequest(domElems);
			req.get();
		};
	};

	var Hooks = function() {
		
	};

	var Rykstrapper = function() {
		var livevars = new LiveVars();

		livevars.exec();
	};

	this.rykstrapper = new RykStrapper();	
};

var liliumcms = new LiliumCMS();
