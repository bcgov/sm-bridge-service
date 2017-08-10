/*jshint node:true, esversion: 6 */
'use strict';

var app = require('express')();
var jwt = require('jsonwebtoken');
var encodeUrl = require('encodeurl');
var winston = require('winston');
var helmet = require('helmet');

var ISSUER = process.env.ISSUER || "http://localhost:8080";
var REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:9090";
var TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || 60;
var SECRET = process.env.SECRET || "4mq9aab5Ut5uGxvnFJyhTMa6ACaOWbfhC9V0PC3zjPquz5bzwtVb8BZKivZHSG+uDoUoo2W4GN8nBiyLqU3JGhuao18hficOokxEGlMHHQBz4GnUfLeMO+Z84iIpgddDJDGe+O2TlkUU3fNd1ua5BGNN8cVI4CVZlQnzgwEgePhhn6VsRyjaJu41/JJYrjtkr9LxPGBuhfpuBbMAv16LgC6RPtwQ1fWowPgPykUaK3O2CVgUpTMCldLi/N4snmme8c2K40WF7Q5I+QJUKu5QbEbOOexFF/8bK+V6fFI1tXLCoTfgw2/s1iUdWGgUllTIjyySG8Oeb+g1tfHmtlrYnw==\n";
var HEADER_MAPPER = process.env.HEADER_MAPPER ||  [
  {"incoming": "SMGOV_USERIDENTIFIER", "outgoing": "sub", "required": true},
  {"incoming": "SMGOV_USERTYPE", "outgoing": "userType", "required": true},
  {"incoming": "SMGOV_USERDISPLAYNAME", "outgoing": "name", "required": true}
];
var SERVICE_IP = process.env.LISTEN_IP || '127.0.0.1';
var SERVICE_PORT = process.env.SERVICE_PORT || 8080;
var HOSTNAME = require('os').hostname();
var LOG_LEVEL = process.env.LOG_LEVEL || "debug";

var WINSTON_HOST = process.env.WINSTON_HOST;
var WINSTON_PORT = process.env.WINSTON_PORT;

// Export consts for unit tests
exports.ISSUER = ISSUER;
exports.REDIRECT_URI = REDIRECT_URI;
exports.SECRET = SECRET;
exports.HEADER_MAPPER = HEADER_MAPPER;

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

// Enable security package
app.use(helmet());

////////////////////////////////////////////////////////
/*
 * App Shutdown
 */
////////////////////////////////////////////////////////
var shutDown = function () {
  winston.info('Shutting down...');
  server.close();
}
exports.shutDown = shutDown;

////////////////////////////////////////////////////////
/*
 * Creates a JWT based on SiteMinder HTTP Headers
 */
////////////////////////////////////////////////////////
var createJWT = function (headers, nonce) {
  return new Promise(function (resolve, reject) {
    try {
      winston.debug(`Creating JWT for headers: ` + JSON.stringify(headers));

      // Setup basic ID Token
      var data = {
        "iss": ISSUER,
        "aud": REDIRECT_URI,
        "nonce": nonce,

        "iat": Math.floor((new Date).getTime()/1000)
      };

      // Sign our token
      var idTokenSigned = jwt.sign(data, SECRET, { expiresIn: TOKEN_EXPIRY + 'm' });

      resolve(idTokenSigned);

    } catch (e) {
      winston.error(`Unexpected error in creating JWT: ` + JSON.stringify(e));
      reject();
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

  // ensure required nonce parameter is provided
  if (!req.query["nonce"]) {
    res.status(400).send(makeOAuth2ErrorResponse("invalid_request","missing nonce in query string, e.g., nonce=<randomvalue>"));
    return;
  }

  // ensure require headers are provided by SiteMinder
  for (var i = 0; i < HEADER_MAPPER.length; i++) {
    if (!req.header(HEADER_MAPPER[i].incoming)) {
      res.status(400).send(makeOAuth2ErrorResponse("authentication_failure","missing required HTTP header: " + HEADER_MAPPER[i].incoming));
      return;
    }
  }

  createJWT(req.headers, req.query["nonce"])
    .then(function (token) {
      res.redirect(REDIRECT_URI + "?access_token=" + encodeURIComponent(JSON.stringify(token)))
    }).catch(function (error) {
      res.status(500).send(makeOAuth2ErrorResponse("unknown_error", "unknown error occurred, review logs on the service for more details."));
    });
});

////////////////////////////////////////////////////////
/*
 * A simple endpoint for service monitors to check it's
 * status
 */
////////////////////////////////////////////////////////
app.get('/status', function (req, res) {
  res.sendStatus(200);
});

function makeOAuth2ErrorResponse(errorCode, error) {
  return {"error" : errorCode, "error_description" :error}
}
exports.makeOAuth2ErrorResponse = makeOAuth2ErrorResponse;