/*!
 * System Dashboard
 *
 * @author David I. Lehn
 */
(function($) {

'use strict';

var data;

// Used here:
// http://square.github.com/cube/
// http://square.github.com/cubism/
//
// Might be useful for other viz:
// http://stackoverflow.com/questions/9664642/d3-real-time-streamgraph-graph-data-visualization
// http://bost.ocks.org/mike/path/
// http://bl.ocks.org/4060954

$(document).ready(function() {
  // alias
  data = window.data;

  var div = '#stats';

  // supported step sizes
  var sec_per_step = 10; /* 10s */
  //var sec_per_step = 60; /* 1m */
  //var sec_per_step = 300; /* 5m */
  //var sec_per_step = 3600; /* 1h */
  //var sec_per_step = 86400; /* 1d */

  var context = cubism.context()
    .step(sec_per_step * 1000)
    .size($(div).width());
  var cube = context.cube("http://localhost:1081");

  function addCurrencyMetrics(metrics, currency) {
    metrics.push(cube
      .metric('sum(settled.eq(currency, "' + currency + '"))')
      .alias(currency + ' Settled (total)'));
    metrics.push(cube
      .metric('sum(settled.eq(currency, "' + currency + '")) / ' + sec_per_step)
      .alias(currency + ' Settled (avg)'));
    metrics.push(cube
      .metric('sum(settled(authorized_ms).eq(currency, "' + currency + '")) / sum(settled.eq(currency, "' + currency + '"))')
      .alias(currency + ' Settled (ms until authorized)'));
    metrics.push(cube
      .metric('sum(settled(settled_ms).eq(currency, "' + currency + '")) / sum(settled.eq(currency, "' + currency + '"))')
      .alias(currency + ' Settled (ms until settled)'));
    metrics.push(cube
      .metric('sum(settled(amount).eq(currency, "' + currency + '"))')
      .alias(currency + ' Settled Amount (total)'));
    metrics.push(cube
      .metric('sum(settled(amount).eq(currency, "' + currency + '")) / sum(settled.eq(currency, "' + currency + '"))')
      .alias(currency + ' Settled Amount (avg)'));

    metrics.push(cube
      .metric('sum(voided.eq(currency, "' + currency + '"))')
      .alias(currency + ' Voided'));
    metrics.push(cube
      .metric('sum(voided(authorized_ms).eq(currency, "' + currency + '")) / sum(voided.eq(currency, "' + currency + '"))')
      .alias(currency + ' Voided (ms until authorized)'));
    metrics.push(cube
      .metric('sum(voided(voided_ms).eq(currency, "' + currency + '")) / sum(voided.eq(currency, "' + currency + '"))')
      .alias(currency + ' Voided (ms until voided)'));
    metrics.push(cube
      .metric('sum(voided(amount).eq(currency, "' + currency + '"))')
      .alias(currency + ' Voided Amount (total)'));
    metrics.push(cube
      .metric('sum(voided(amount).eq(currency, "' + currency + '")) / sum(voided.eq(currency, "' + currency + '"))')
      .alias(currency + ' Voided Amount (avg)'));

    // FIXME: busted
    metrics.push(cube
      .metric('sum(settled(amount).eq(currency, "' + currency + '").eq(type,"contract"))')
      .alias(currency + ' Contract Amount'));
    metrics.push(cube
      .metric('sum(settled(amount).eq(currency, "' + currency + '").eq(type,"deposit"))')
      .alias(currency + ' Deposit Amount'));
    metrics.push(cube
      .metric('sum(settled(amount).eq(currency, "' + currency + '").eq(type,"withdrawal"))')
      .alias(currency + ' Withdrawal Amount'));

    // FIXME: registrations, logins, etc
    // ...
  }

  //console.log(cube);
  var metrics = [];
  //metrics.push(cube.metric('sum(cube_request)').alias('Cube Request'));
  addCurrencyMetrics(metrics, "USD");
  //console.log(metrics);

  d3.select(div).selectAll(".axis")
      .data(["top", "bottom"])
    .enter().append("div")
      .attr("class", function(d) { return d + " axis"; })
      .each(function(d) {
        d3.select(this).call(context.axis().ticks(12).orient(d));
      });

  d3.select(div).append("div")
      .attr("class", "rule")
      .call(context.rule());

  d3.select(div).selectAll(".horizon")
      //.data(d3.range(1, 20).map(random))
      .data(metrics)
    .enter().insert("div", ".bottom")
      .attr("class", "horizon")
      //.call(context.horizon().extent([-10, 10]));
      .call(context.horizon());

  context.on("focus", function(i) {
    d3.selectAll(".value").style("right", i === null ? null : context.size() - i + "px");
  });

  // Replace this with context.graphite and graphite.metric!
  /*
  function random(x) {
    var value = 0,
        values = [],
        i = 0,
        last;
    return context.metric(function(start, stop, step, callback) {
      start = +start, stop = +stop;
      if (isNaN(last)) last = start;
      while (last < stop) {
        last += step;
        value = Math.max(-10, Math.min(10, value + .8 * Math.random() - .4 + .2 * Math.cos(i += x * .02)));
        values.push(value);
      }
      callback(null, values = values.slice((start - stop) / step));
    }, x);
  }
  */
});

})(jQuery);
