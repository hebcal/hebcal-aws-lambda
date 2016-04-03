var querystring = require('querystring'),
    http = require('http');

var googleAnalytics = {
    tid: 'UA-967247-4',

    an: 'Hebcal',

    extend: function(destination, source) {
        if (typeof source === 'object') {
            for (var attr in source) {
                if (source.hasOwnProperty(attr)) {
                    destination[attr] = source[attr];
                }
            }
        }
        return destination;
    },

    send: function(hitType, userId, params) {
        var postParams = {
            v: '1',
            tid: this.tid,
            t: hitType,
            cid: userId,
            an: this.an
        };

        postParams = this.extend(postParams, params);

        var postData = querystring.stringify(postParams);

        var options = {
            hostname: 'www.google-analytics.com',
            port: 80,
            path: '/collect',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length
            }
        };

        var req = http.request(options);

        req.on('error', function(e) {
            console.log('problem with request: ' + e.message);
        });

        // write data to request body
        req.write(postData);
        req.end();
    },

    screenview: function(userId, screenName, options) {
        var params = {
            cd: screenName,
            geoid: 'US'
        };
        params = this.extend(params, options);
        this.send('screenview', userId, params);
    },

    event: function(userId, category, action, label, options) {
        var params = {
            ec: category,
            ea: action,
            el: label,
            geoid: 'US'
        };
        params = this.extend(params, options);
        this.send('event', userId, params);
    },

    exception: function(userId, description, options) {
        var params = {
            exd: description,
            geoid: 'US'
        };
        params = this.extend(params, options);
        this.send('exception', userId, params);
    }
};

/*
var x = sendGoogleTracking(
    'amzn1.echo-sdk-account.AHRVRFOJLP4R4KXNPWESNCVBSWW5KMACYFEUBEZ4GGUBKS3DTSG7Q',
    'AwesomeIntent', {
        ec: 'video',
        ea: 'play',
        el: 'holiday',
        ev: 300
    });
console.log(x);
*/

module.exports = googleAnalytics;
