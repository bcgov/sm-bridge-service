const request = require("request");
const url = require('url');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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
      let nonce = crypto.randomBytes(32).toString('Base64');
      request.get({
        url: base_url + "/authorize?nonce=" + nonce,
        followRedirect: false,
        headers: {
          "SMGOV_USERIDENTIFIER": "89123hj1kj2389asjkdhajksd",
          "SMGOV_USERTYPE": "BUSINESS",
          "SMGOV_USERDISPLAYNAME": "Greg"

        }
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

        // Parse string
        let accessToken = JSON.parse(accessTokenString);
        expect(accessToken).toBeTruthy();

        // Verify token and decode token
        let accessTokenDecoded = jwt.verify(accessToken, service.SECRET);
        expect(accessTokenDecoded).toBeTruthy();

        // Confirm token attributes
        expect(accessTokenDecoded.iss).toBe(service.ISSUER);
        expect(accessTokenDecoded.aud).toBe(service.REDIRECT_URI);
        expect(accessTokenDecoded.nonce).toBe(nonce);


        console.log(JSON.stringify(accessTokenDecoded));

        done();

      });
    });
  });

});