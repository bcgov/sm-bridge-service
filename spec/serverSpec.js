var request = require("request");

describe("API Server", function() {

  var server;
  var base_url = "http://localhost:8080";

  beforeAll(function() {
    server = require("../server");
  });

  afterAll(function() {
    server.shutDown();
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
    it("should fail with a nonce", function (done) {
      request.get({url: base_url + "/authorize", followRedirect: false}, function (error, response, body) {
        expect(error).toBeNull();
        expect(response).toBeDefined();
        expect(response.statusCode).toBe(400);
        expect(body).toBe(JSON.stringify(server.makeOAuth2ErrorResponse("invalid_request", "missing nonce in query string, e.g., nonce=<randomvalue>")));
        done();

      });
    });
    it("should fail without SM headers", function (done) {
      request.get({url: base_url + "/authorize?nonce=1231jkajhxuyqkjwe", followRedirect: false}, function (error, response, body) {
        expect(error).toBeNull();
        expect(response).toBeDefined();
        expect(response.statusCode).toBe(400);
        expect(body).toBe(JSON.stringify(server.makeOAuth2ErrorResponse("authentication_failure", "missing required HTTP header: SMGOV_USERIDENTIFIER")));
        done();

      });
    });
  });

});