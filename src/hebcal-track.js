const querystring = require('querystring');

const http = require('http');
const crypto = require('crypto');

const googleAnalytics = {
    tid: 'UA-967247-4',

    an: 'Hebcal',

    extend(destination, source) {
        if (typeof source === 'object') {
            for (const attr in source) {
                if (source.hasOwnProperty(attr)) {
                    destination[attr] = source[attr];
                }
            }
        }
        return destination;
    },

    hashUuid4(str) {
        const hash = crypto.createHash('md5');
        let digest;
        hash.update(str);
        digest = hash.digest('hex');
        return `${digest.substr(0, 8)}-${digest.substr(8, 4)}-4${digest.substr(13, 3)}-8${digest.substr(17, 3)}-${digest.substr(20, 12)}`;
    },

    send(hitType, userId, params) {
        let postParams = {
            v: '1',
            tid: this.tid,
            t: hitType,
            cid: this.hashUuid4(userId),
            an: this.an
        };

        postParams = this.extend(postParams, params);

        const postData = querystring.stringify(postParams);
        console.log(`TRACKING: ${postData}`);

        const options = {
            hostname: 'www.google-analytics.com',
            port: 80,
            path: '/collect',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length
            }
        };

        const req = http.request(options);

        req.on('error', ({message}) => {
            console.log(`problem with request: ${message}`);
        });

        // write data to request body
        req.write(postData);
        req.end();
    },

    screenview(userId, screenName, options) {
        let params = {
            cd: screenName,
            geoid: 'US'
        };
        params = this.extend(params, options);
        this.send('screenview', userId, params);
    },

    event(userId, category, action, label, options) {
        let params = {
            ec: category,
            ea: action,
            geoid: 'US'
        };
        if (typeof label !== 'undefined') {
            params.el = label;
        }
        params = this.extend(params, options);
        this.send('event', userId, params);
    },

    exception(userId, description, options) {
        let params = {
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
