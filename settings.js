var _c = require('./config.js');
var filelogic = require('./filelogic.js');
var forms = require('./formBuilder.js');

var Settings = function() {
	this.handleGET = function(cli) {
		cli.touch('settings.handleGET');
		filelogic.serveAdminLML(cli);
	};

	this.registerForm = function() {
		forms.createForm('settings_form', {
			fieldWrapper : {
				tag : 'div',
				cssPrefix : 'settingsfield-'
			},
			cssClass: 'admin-settings-form'
		})

		.add('database-sep', 'title', {displayname : "Database"})
		.add('default.data.host', 'text', {displayname:"Host"})
		.add('default.data.port', 'text', {displayname:"Port"})
		.add('default.data.user', 'text', {displayname:"Username"})
		.add('default.data.pass', 'password', {displayname:"Password"})
		.add('default.data.use', 'text', {displayname:"Database Name"})
		
		.add('paths-sep', 'title', {displayname : "Paths"})
		.add('default.paths.admin', 'text', {displayname : "Admin"})
		.add('default.paths.login', 'text', {displayname : "Login"})
		.add('default.paths.livevars', 'text', {displayname : "Live Variables"})
		.add('default.paths.themes', 'text', {displayname : "Themes"})
		.add('default.paths.mail', 'text', {displayname : "Email"})
		.add('default.paths.themesInfo', 'text', {displayname : "Themes info file"})
		.add('default.paths.plugins', 'text', {displayname : "Plugins"})
		.add('default.paths.pluginsInfo', 'text', {displayname : "Plugins info file"})
		.add('default.paths.uploads', 'text', {displayname : "Uploads"})
		
		.add('server-sep', 'title', {displayname : "Server"})
		.add('default.server.base', 'text', {displayname : "Lilium Root Directory"})
		.add('default.server.html', 'text', {displayname : "HTML Directory"})
		.add('default.server.url', 'text', {displayname : "Base URL"})
		.add('default.server.port', 'text', {displayname : "Port"})
		.add('default.server.postMaxLength', 'number', {displayname : "POST Maximum Length"})
		.add('default.server.fileMaxSize', 'number', {displayname : "POST Maximum File Size"})

		.add('stripe-sep', "title", {displayname: "Stripe"})
		.add('default.stripe.publickey', 'text', {displayname:"Public Key"})
		.add('default.stripe.secretkey', 'text', {displayname:"Secret Key"})

		.add('email-sep', 'title', {displayname: "Email System"})
		.add('default.emails.default', 'text', {displayname: "Sender"})

		.add('dev-sep', 'title', {displayname: "Developers"})
		.add('default.env', 'select', {displayname: "Environment", datasource:[
			{name:"dev", displayName:"Development"},
			{name:"prod",displayName:"Production"}]
		})

		.add('action-sep', 'title', {displayname: "Actions"})
		.add('submit', 'submit', {displayname: "Save (WIP)"});
	};

	this.registerLiveVar = function() {
		require('./livevars.js').registerLiveVariable('settings', function(cli, levels, params, callback) {
			callback(_c);
		}, ["admin"]);
	};
};

module.exports = new Settings();
