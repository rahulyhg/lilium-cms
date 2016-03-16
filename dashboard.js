var log = require('./log.js');
var config = require('./config.js');
var Petal = require('./petal.js');
var filelogic = require('./filelogic.js');
var lmllib = require('./lmllib.js');

var _dashpetals = new Array();

var Dashboard = function() {
	this.getPetals = function() {
		pets = new Array();

		for (var pos in _dashpetals) {
			pets.push(Petal.get(_dashpetals[pos]).id);
		}

		return pets;
	};

	this.registerDashPetal = function(petalID, prio) {
		while (typeof _dashpetals[prio] !== 'undefined') prio++;
		_dashpetals[prio] = petalID;
	};

	this.handleGET = function(cli) {
		filelogic.serveAdminLML(cli);
	};

	this.registerLMLLib = function() {
		lmllib.registerContextLibrary('dashboard', function(context) {
			return new Dashboard();
		});
	};
};

module.exports = new Dashboard();
