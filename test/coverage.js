// http://www.nearinfinity.com/blogs/jeff_kunkle/automatic_code_coverage_switch.html

// test/coverage.js
var covererageOn = process.argv.some(function(arg) {
  return /^--cover/.test(arg);  
});

if (covererageOn) {
  console.log('Code coverage on');

  exports.require = function(path) {
    var instrumentedPath = path.replace('/lib', '/lib-cov');

    try {
      require.resolve(instrumentedPath);
      return require(instrumentedPath);
    } catch (e) {
      console.log('Coverage on, but no instrumented file found at ' 
        + instrumentedPath);
      return require(path);
    }
  }
} else {
  console.log('Code coverage off');
  exports.require = require;
}
