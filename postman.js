var _c = require('./config.js');
var log = require('./log.js');
var nodemailer = require('nodemailer');

var transporter = undefined;
var messagesQueue = new Array();

var Postman = function() {
	var sendNextMessage = function() {
        	transporter.send(messagesQueue.shift());
	};

	this.createTransporter = function() {
		log('Postman', 'Creating nodemailer transport');
		
		// TODO : Replace host by config host name (will not work with localhost unless using a local mail server)
		transporter = nodemailer.createTransport('direct:?name=http://www.mtlblog.com');

		transporter.on('idle', function(){
    			while(transporter.isIdle() && messagesQueue.length){
    				sendNextMessage();
			}
		});
	};	
};

module.exports = new Postman();
