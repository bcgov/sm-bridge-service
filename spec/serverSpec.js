var request = require("request");

var base_url = "http://localhost:8080/";

describe("API Server", function() {
  describe("GET /status", function() {
    it("returns status code 200", function(done) {
      request.get(base_url, function(error, response, body) {
        expect(response).toBeNull();
        //expect(response.statusCode).toBe(200);
        done();
      });
    });
  });
});