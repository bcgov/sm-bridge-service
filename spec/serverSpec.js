const request = require("request");
const url = require('url');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const async = require('async');

describe("API Server", function() {

  let service;
  let base_url = "http://localhost:8080";

  beforeAll(function() {
    service = require("../server");
  });

  afterAll(function() {
    service.shutDown();
  });

  describe("GET /status", function() {
    it("returns status code 200", function(done) {
      request.get(base_url + '/status', function(error, response, body) {
        expect(error).toBeNull();
        expect(response).toBeDefined();
        expect(response.statusCode).toBe(200);
        expect(body).toBe("OK");
        done();
      });
    });
  });

  describe("GET /authorize", function() {

    it("should fail without a nonce", function (done) {
      request.get({url: base_url + "/authorize", followRedirect: false}, function (error, response, body) {
        expect(error).toBeNull();
        expect(response).toBeDefined();
        expect(response.statusCode).toBe(400);
        expect(body).toBe(JSON.stringify(service.makeOAuth2ErrorResponse("invalid_request", "missing nonce in query string, e.g., nonce=<randomvalue>")));
        done();

      });
    });
    it("should fail without a nonce value", function (done) {
      request.get({url: base_url + "/authorize?nonce=", followRedirect: false}, function (error, response, body) {
        expect(error).toBeNull();
        expect(response).toBeDefined();
        expect(response.statusCode).toBe(400);
        expect(body).toBe(JSON.stringify(service.makeOAuth2ErrorResponse("invalid_request", "missing nonce in query string, e.g., nonce=<randomvalue>")));
        done();

      });
    });
    it("should fail without SM headers", function (done) {
      request.get({url: base_url + "/authorize?nonce=1231jkajhxuyqkjwe", followRedirect: false}, function (error, response, body) {
        expect(error).toBeNull();
        expect(response).toBeDefined();
        expect(response.statusCode).toBe(400);
        expect(body).toBe(JSON.stringify(service.makeOAuth2ErrorResponse("authentication_failure", "missing required HTTP header: SMGOV_USERIDENTIFIER")));
        done();

      });
    });
    it("should succeed with nonce reflected", function (done) {
      let nonce = encodeURIComponent(crypto.randomBytes(32).toString('Base64'));
      let requestHeaders = {
        "SMGOV_USERIDENTIFIER": "89123hj1kj2389asjkdhajksd",
        "SMGOV_USERTYPE": "BUSINESS",
        "SMGOV_USERDISPLAYNAME": "Greg\\ \"Turner'",
        "SMGOV_EMAIL": ""
      };

      request.get({
        url: base_url + "/authorize?nonce=" + nonce,
        followRedirect: false,
        headers: requestHeaders
      }, function (error, response, body) {
        expect(error).toBeNull();
        expect(response).toBeTruthy();
        expect(response.statusCode).toBe(302);
        expect(response.headers["location"]).toBeTruthy();

        // Parse location response header
        let redirectUrl = url.parse(response.headers["location"], true);
        expect(redirectUrl).toBeDefined();
        expect(redirectUrl.query["access_token"]).toBeTruthy();

        // decode access token
        let accessTokenString = decodeURIComponent(redirectUrl.query["access_token"]);
        expect(accessTokenString).toBeTruthy();

        console.log(accessTokenString);

        // Parse string
        let accessToken = JSON.parse(accessTokenString);
        expect(accessToken).toBeTruthy();

        // Verify token and decode token
        let accessTokenDecoded = jwt.verify(accessToken, service.SECRET);
        expect(accessTokenDecoded).toBeTruthy();

        // Confirm token attributes
        expect(accessTokenDecoded.iss).toBe(service.ISSUER);
        expect(accessTokenDecoded.aud).toBe(service.REDIRECT_URI);
        expect(accessTokenDecoded.nonce).toBe(decodeURIComponent(nonce));
        expect(accessTokenDecoded.exp).toBe(accessTokenDecoded.iat + service.TOKEN_EXPIRY * 60);

        // Look for correct mapping
        Object.keys(requestHeaders).forEach(function (key) {
          for (let i = 0; i < service.HEADER_MAPPER.length; i++) {
            if (service.HEADER_MAPPER[i].incoming === key) {
              expect(accessTokenDecoded[service.HEADER_MAPPER[i].outgoing]).toBe(requestHeaders[key]);
            }
          }
        });

        done();

      });
    });
    it("should succeed with X-Forward-For", function (done) {
      let nonce = encodeURIComponent(crypto.randomBytes(32).toString('Base64'));
      let requestHeaders = {
        "SMGOV_USERIDENTIFIER": "89123hj1kj2389asjkdhajksd",
        "SMGOV_USERTYPE": "BUSINESS",
        "SMGOV_USERDISPLAYNAME": "Greg\\ \"Turner'",
        "X-Forwarded-For": "127.0.0.1"
      };

      request.get({
        url: base_url + "/authorize?nonce=" + nonce,
        followRedirect: false,
        headers: requestHeaders
      }, function (error, response, body) {
        expect(error).toBeNull();
        expect(response).toBeTruthy();
        expect(response.statusCode).toBe(302);
        expect(response.headers["location"]).toBeTruthy();

        // Parse location response header
        let redirectUrl = url.parse(response.headers["location"], true);
        expect(redirectUrl).toBeDefined();
        expect(redirectUrl.query["access_token"]).toBeTruthy();



        done();

      });
    });

    it("should be denied with unknown X-Forward-For", function (done) {
      let nonce = encodeURIComponent(crypto.randomBytes(32).toString('Base64'));
      let requestHeaders = {
        "SMGOV_USERIDENTIFIER": "89123hj1kj2389asjkdhajksd",
        "SMGOV_USERTYPE": "BUSINESS",
        "SMGOV_USERDISPLAYNAME": "Greg\\ \"Turner'",
        "X-Forwarded-For": "10.0.0.1, 127.0.0.1"
      };

      request.get({
        url: base_url + "/authorize?nonce=" + nonce,
        followRedirect: false,
        headers: requestHeaders
      }, function (error, response, body) {
        expect(error).toBeNull();
        expect(response).toBeTruthy();
        expect(response.statusCode).toBe(401);

        done();

      });
    });

    /*
    it("should handle multiple callers (async tests)", function (done) {

      async.times(100, function(n, next) {

        let nonce = encodeURIComponent(crypto.randomBytes(32).toString('Base64'));
        let requestHeaders = {
          "SMGOV_USERIDENTIFIER": crypto.randomBytes(32).toString('Base64'),
          "SMGOV_USERTYPE": crypto.randomBytes(32).toString('Base64'),
          "SMGOV_USERDISPLAYNAME": crypto.randomBytes(32).toString('Base64'),
          "SMGOV_EMAIL": crypto.randomBytes(32).toString('Base64')

        };

        request.get({
          url: base_url + "/authorize?nonce=" + nonce,
          followRedirect: false,
          headers: requestHeaders
        }, function (error, response, body) {
          expect(error).toBeNull();
          expect(response).toBeTruthy();
          expect(response.statusCode).toBe(302);
          expect(response.headers["location"]).toBeTruthy();

          // Parse location response header
          let redirectUrl = url.parse(response.headers["location"], true);
          expect(redirectUrl).toBeDefined();
          expect(redirectUrl.query["access_token"]).toBeTruthy();

          // decode access token
          let accessTokenString = decodeURIComponent(redirectUrl.query["access_token"]);
          expect(accessTokenString).toBeTruthy();

          console.log(accessTokenString);

          // Parse string
          let accessToken = JSON.parse(accessTokenString);
          expect(accessToken).toBeTruthy();

          // Verify token and decode token
          let accessTokenDecoded = jwt.verify(accessToken, service.SECRET);
          expect(accessTokenDecoded).toBeTruthy();

          // Confirm token attributes
          expect(accessTokenDecoded.iss).toBe(service.ISSUER);
          expect(accessTokenDecoded.aud).toBe(service.REDIRECT_URI);
          expect(accessTokenDecoded.nonce).toBe(decodeURIComponent(nonce));
          expect(accessTokenDecoded.exp).toBe(accessTokenDecoded.iat + service.TOKEN_EXPIRY * 60);

          // Look for correct mapping
          Object.keys(requestHeaders).forEach(function (key) {
            for (let i = 0; i < service.HEADER_MAPPER.length; i++) {
              if (service.HEADER_MAPPER[i].incoming === key) {
                expect(accessTokenDecoded[service.HEADER_MAPPER[i].outgoing]).toBe(requestHeaders[key]);
              }
            }
          });

          next();
        });
      }, function(err, users) {
        done();
      });
    });
    */
  });

});