/*jshint node:true, esversion: 6 */
'use strict';

var app = require('express')();
var jwt = require('jsonwebtoken');
var winston = require('winston');

var ISSUER = process.env.ISSUER || "http://localhost:8080";
var REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:9090";
var TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || 0;
var SECRET = process.env.SECRET || "4mq9aab5Ut5uGxvnFJyhTMa6ACaOWbfhC9V0PC3zjPquz5bzwtVb8BZKivZHSG+uDoUoo2W4GN8nBiyLqU3JGhuao18hficOokxEGlMHHQBz4GnUfLeMO+Z84iIpgddDJDGe+O2TlkUU3fNd1ua5BGNN8cVI4CVZlQnzgwEgePhhn6VsRyjaJu41/JJYrjtkr9LxPGBuhfpuBbMAv16LgC6RPtwQ1fWowPgPykUaK3O2CVgUpTMCldLi/N4snmme8c2K40WF7Q5I+QJUKu5QbEbOOexFF/8bK+V6fFI1tXLCoTfgw2/s1iUdWGgUllTIjyySG8Oeb+g1tfHmtlrYnw==\n";
var SERVICE_IP = process.env.LISTEN_IP || '0.0.0.0';
var SERVICE_PORT = process.env.SERVICE_PORT || 8080;
var HOSTNAME = require('os').hostname();
var LOG_LEVEL = process.env.LOG_LEVEL || "debug";

var WINSTON_HOST = process.env.WINSTON_HOST;
var WINSTON_PORT = process.env.WINSTON_PORT;

// Prevent default keys and other settings from going into production
if (process.env.NODE_ENV == 'production') {
  if (SECRET == '4mq9aab5Ut5uGxvnFJyhTMa6ACaOWbfhC9V0PC3zjPquz5bzwtVb8BZKivZHSG+uDoUoo2W4GN8nBiyLqU3JGhuao18hficOokxEGlMHHQBz4GnUfLeMO+Z84iIpgddDJDGe+O2TlkUU3fNd1ua5BGNN8cVI4CVZlQnzgwEgePhhn6VsRyjaJu41/JJYrjtkr9LxPGBuhfpuBbMAv16LgC6RPtwQ1fWowPgPykUaK3O2CVgUpTMCldLi/N4snmme8c2K40WF7Q5I+QJUKu5QbEbOOexFF/8bK+V6fFI1tXLCoTfgw2/s1iUdWGgUllTIjyySG8Oeb+g1tfHmtlrYnw==\n') {
    winston.error("You MUST change SECRET before running in a production environment.");
    process.exit(1);
  }
  if (ISSUER == 'http://localhost:8080') {
    winston.error("You MUST change ISSUER before running in a production environment.");
    process.exit(1);
  }
  if (REDIRECT_URI == 'http://localhost:9090') {
    winston.error("You MUST change REDIRECT_URI before running in a production environment.");
    process.exit(1);
  }
}

////////////////////////////////////////////////////////
/*
 * Logger init
 */
////////////////////////////////////////////////////////
winston.level = LOG_LEVEL;
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {'timestamp': true});
if (process.env.WINSTON_PORT) {
  winston.add(winston.transports.Syslog, {
    host: WINSTON_HOST,
    port: WINSTON_PORT,
    protocol: 'udp4',
    localhost: HOSTNAME
  });
}

////////////////////////////////////////////////////////
/*
 * App Startup
 */
////////////////////////////////////////////////////////

var server = app.listen(SERVICE_PORT, SERVICE_IP, function () {
  var host = server.address().address;
  var port = server.address().port;
  winston.info(`SM Bridge Service listening at http://${host}:${port}`);
  winston.info(`Log level is at: ${LOG_LEVEL}`);
});

////////////////////////////////////////////////////////
/*
 * Creates a JWT based on SiteMinder HTTP Headers
 */
////////////////////////////////////////////////////////
var createJWT = function (token, nonce) {
  winston.debug(`verifying: ${token} against ${nonce}`);
  return new Promise(function (resolve, reject) {
    try {

      var decoded = jwt.verify(token, SECRET);
      winston.debug(`decoded: ` + JSON.stringify(decoded));

      if (decoded.nonce === nonce) {
        winston.debug(`Captcha Valid`);
        resolve({valid: true});
      } else {
        winston.debug(`Captcha Invalid!`);
        resolve({valid: false});
      }
    } catch (e) {
      winston.error(`Token/ResourceID Verification Failed: ` + JSON.stringify(e));
      resolve({valid: false});
    }
  });
};
exports.createJWT = createJWT;

////////////////////////////////////////////////////////
/*
 * A simple Auth2 endpoint for making JWTs
 */
////////////////////////////////////////////////////////
app.get('/authorize', function (req, res) {
  createJWT(req.body.token, req.body.nonce)
    .then(function (ret) {
      res.send(ret);
    });
});

////////////////////////////////////////////////////////
/*
 * A simple endpoint for service monitors to check it's
 * status
 */
////////////////////////////////////////////////////////
app.get('/status', function (req, res) {
  res.send(200);
});