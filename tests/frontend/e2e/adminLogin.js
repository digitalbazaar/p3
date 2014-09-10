var helper = require('../helper');

describe('admin login', function() {

  it('should login from the navbar', function() {
    helper.login('admin', 'password');
    helper.waitForUrl('/i/admin/dashboard');
  });

  it('should logout from the navbar', function() {
    helper.logout();
  });
});
