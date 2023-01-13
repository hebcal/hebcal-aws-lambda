const http = require('node:http');
const crypto = require('crypto');

const matomoAnalytics = {
    extend(destination, source) {
        if (typeof source === 'object') {
            Object.assign(destination, source);
        }
        return destination;
    },

    hashUuid4(str) {
        const hash = crypto.createHash('md5');
        hash.update(str);
        const digest = hash.digest('hex');
        return `${digest.substr(0, 8)}-${digest.substr(8, 4)}-4${digest.substr(13, 3)}-8${digest.substr(17, 3)}-${digest.substr(20, 12)}`;
    },

    send(hitType, userId, params) {
        const args = new URLSearchParams();
        args.set('rec', '1');
        args.set('apiv', '1');
        args.set('idsite', '4');
        args.set('send_image', '0'); // prefer HTTP 204 instead of a GIF image
        args.set('e_c', hitType);
        args.set('e_a', params.cd || params.ec);
        const name = params.ea;
        if (name) {
          args.set('e_n', name);
        }
        if (userId) {
          const uid = this.hashUuid4(userId);
          args.set('uid', uid);
          const vid = uid.substring(0, 4) + uid.substring(24);
          if (vid.length === 16) {
            args.set('_id', vid);
            args.set('cid', vid);
          }
        }
        const postData = args.toString();
        const postLen = Buffer.byteLength(postData);
        let path = '/ma/ma.php';
        let sendPostBody = true;
        if (postLen < 4000) {
          path += '?' + postData;
          sendPostBody = false;
        }
        const httpHost = 'www.hebcal.com';
        const headers = {
          'Host': httpHost,
          'X-Forwarded-Proto': 'https',
          'User-Agent': 'hebcal-aws-lambda/0.9.4',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': sendPostBody ? postLen : 0,
        };
        const options = {
          hostname: httpHost,
          port: 80,
          path: path,
          method: 'POST',
          headers: headers,
        };
        console.log(`TRACKING: ${postData}`);
        const req = http.request(options);
        req.on('error', (err) => {
          console.log(`problem with request: ${err.message}`);
        });
        req.setTimeout(1000);
        if (sendPostBody) {
          req.write(postData);
        }
        req.end();
    },

    screenview(userId, screenName, options) {
        let params = {
            cd: screenName
        };
        params = this.extend(params, options);
        this.send('screenview', userId, params);
    },

    event(userId, category, action, label, options) {
        let params = {
            ec: category,
            ea: action
        };
        if (typeof label !== 'undefined') {
            params.el = label;
        }
        params = this.extend(params, options);
        this.send('event', userId, params);
    },

    exception(userId, description, options) {
        let params = {
            exd: description
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

module.exports = matomoAnalytics;
