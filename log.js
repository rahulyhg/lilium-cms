var nameMaxLength = 18;

var separator = "";
for (var i = 0; i < nameMaxLength; i++) {
	separator += " ";
}

var log = function(sender, message) {
	if (typeof message !== 'undefined') {
		var spacing = nameMaxLength - sender.length;
		console.log("[" + new Date() + " - " + sender + "] " + (spacing > 0 ? separator.substr(0, spacing) : '') + message);
	} else {
		console.log('');
	}
}

module.exports = log;
