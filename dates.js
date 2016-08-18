var log = require('./log.js');
var request = require('request');
var tz = require('moment-timezone');

var Dates = function() {
    this.toTimezone = function(date, timezone) {
        log('Dates', 'Calculating timezone for ' + timezone + ' at ' + date);
        var newDate = new Date(tz.tz(date, timezone));
        log('Dates', 'Computed ' + newDate);
        
        return newDate;
    };

    this.now = function(_c) {
        if (!_c) {
            return new Date();
        } else {
            return tz.tz(new Date(), _c.timezone);
        }
    };

    this.getTimezoneInfo = function(_c, loc, cb) {
        var url = ('https://maps.googleapis.com/maps/api/timezone/json' + 
            '?location=' + loc + 
            '&timestamp=' + (new Date() / 1000) + 
            '&key=' + _c.google.apikey
        );

        log('Dates', 'Sending request to Google');
        request(url, function(err, resp, result) {
            if (typeof result === 'string') {
                result = JSON.parse(result);
            }

            cb(result);
        });
    };
};

module.exports = new Dates();
