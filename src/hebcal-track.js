const http = require('node:http');
const crypto = require('crypto');
const pkg = require('./package.json');

const matomoAnalytics = {
    hashUuid4(str) {
        const hash = crypto.createHash('md5');
        hash.update(str);
        const digest = hash.digest('hex');
        return `${digest.substr(0, 8)}-${digest.substr(8, 4)}-4${digest.substr(13, 3)}-8${digest.substr(17, 3)}-${digest.substr(20, 12)}`;
    },

    send(category, userId, params) {
        const args = new URLSearchParams();
        args.set('rec', '1');
        args.set('apiv', '1');
        args.set('idsite', '4');
        args.set('send_image', '0'); // prefer HTTP 204 instead of a GIF image
        args.set('lang', 'en'); // replace eventually with request.locale
        args.set('e_c', category);
        args.set('e_a', params.action || '(none)');
        const name = params.label;
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
        if (process.env.MATOMO_TOKEN) {
          const location = params.location;
          if (location) {
            args.set('token_auth', process.env.MATOMO_TOKEN);
            if (location.cc && location.cc.length) {
              args.set('country', location.cc.toLowerCase());
            }
            const cityName = location.name || location.cityName;
            if (cityName && cityName.length) {
              args.set('city', cityName);
            }
            if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
              args.set('lat', location.latitude);
              args.set('long', location.longitude);
            }
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
          'User-Agent': pkg.name + '/' + pkg.version,
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
        req.setTimeout(1000);
        req.on('error', (err) => {
          // this is often 'socket hang up'. Nothing we can do, so just bail.
          req.end();
        });
        if (sendPostBody) {
          req.write(postData);
        }
        req.end();
    },
};

module.exports = matomoAnalytics;
