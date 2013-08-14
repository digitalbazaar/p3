var payswarm = {
  config: require(__libdir + '/config')
};
var should = require('should');
var async = require('async');

var browser = GLOBAL.browser;
var baseUrl = payswarm.config.website.baseUrl;

console.log("BASE URL:", baseUrl);

/**
 * These tests are meant to be chained together, they are not stand-alone tests.
 * That means that the tests are designed to have side effects that are
 * assumed in the following test. This would be the wrong way to write unit
 * tests, but it is the "right way" to create live functionality tests.
 * Eventually, we should have long series of tests that are chained together
 * to ensure that we're simulating standard usage flows for the system.
 */
describe('Development Account', function() {

  it('should be able to access the landing page', function(done) {
    browser.chain()
      .get(baseUrl)
      .title(function(err, title) {
        should.not.exist(err);
        title.should.eql('PaySwarm: Welcome');
        done();
      });
  });

});
