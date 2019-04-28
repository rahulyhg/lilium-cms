const request = require('request');
const tz = require('moment-timezone');

class Dates {
    toTimezone(date, timezone) {
        log('Dates', 'Calculating timezone for ' + timezone + ' at ' + date);
        const newDate = new Date(tz.tz(date, timezone));
        log('Dates', 'Computed ' + newDate);
        
        return newDate;
    };

    now(_c) {
        if (!_c) {
            return new Date();
        } else {
            return tz.tz(new Date(), _c.timezone);
        }
    };

    getTimezoneInfo(_c, loc, cb) {
        const url = ('https://maps.googleapis.com/maps/api/timezone/json' + 
            '?location=' + loc + 
            '&timestamp=' + (new Date() / 1000) + 
            '&key=' + _c.google.apikey
        );

        log('Dates', 'Sending request to Google');
        request(url, (err, resp, result) => {
            if (typeof result === 'string') {
                result = JSON.parse(result);
            }

            cb(result);
        });
    };
};

module.exports = new Dates();
