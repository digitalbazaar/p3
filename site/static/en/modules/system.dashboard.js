/*!
 * System Dashboard
 *
 * @author David I. Lehn
 */
(function($) {

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

  var sec_per_step = 10;

  var context = cubism.context()
    .step(sec_per_step * 1000)
    .size($(div).width());
  var cube = context.cube("http://localhost:1081");

  console.log(cube);
  var metrics = [
    //cube.metric('sum(cube_request)').alias('Cube Request'),

    cube.metric('sum(settled)').alias('Settled (total)'),
    cube.metric('sum(settled) / ' + sec_per_step).alias('Settled (avg)'),
    cube.metric('sum(settled(authorized_ms)) / sum(settled)').alias('Settled (ms until authorized)'),
    cube.metric('sum(settled(settled_ms)) / sum(settled)').alias('Settled (ms until settled)'),
    cube.metric('sum(settled(amount))').alias('Settled Amount (total)'),
    cube.metric('sum(settled(amount)) / sum(settled)').alias('Settled Amount (avg)'),

    cube.metric('sum(voided)').alias('Voided'),
    cube.metric('sum(voided(authorized_ms)) / sum(voided)').alias('Voided (ms until authorized)'),
    cube.metric('sum(voided(voided_ms)) / sum(voided)').alias('Voided (ms until voided)'),
    cube.metric('sum(voided(amount))').alias('Voided Amount (total)'),
    cube.metric('sum(voided(amount)) / sum(voided)').alias('Voided Amount (avg)'),

    //cube.metric('sum(settled(amount).eq(type,"contract"))').alias('Contract Amount'),
    //cube.metric('sum(settled(amount).eq(type,"deposit"))').alias('Deposit Amount'),
    //cube.metric('sum(settled(amount).eq(type,"withdrawal"))').alias('Withdrawal Amount')
  ];
  console.log(metrics);

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
    d3.selectAll(".value").style("right", i == null ? null : context.size() - i + "px");
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
