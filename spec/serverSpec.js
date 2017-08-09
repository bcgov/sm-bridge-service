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
});