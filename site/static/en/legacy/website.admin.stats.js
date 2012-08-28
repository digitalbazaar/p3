/*!
 * Statistics Support
 *
 * @requires jQuery v1.3 or later (http://jquery.com/)
 *
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 */
$(document).ready(function()
{
   // logging category
   var cat = 'payswarm.admin.stats';

   // calculate stat totals
   var calcTotal = function(data, skipKeyCounts)
   {
      var totals = {
         counts: {
            live: 0,
            dead: 0,
            max: 0
         },
         bytes: {
            live: 0,
            dead: 0,
            max: 0
         }
      };
      for(var key in data)
      {
         if(!skipKeyCounts || key != 'KeyCounts')
         {
            var value = data[key];
            totals.counts.live += value.counts.live;
            totals.counts.dead += value.counts.dead;
            totals.counts.max += value.counts.max;
            totals.bytes.live += value.bytes.live;
            totals.bytes.dead += value.bytes.dead;
            totals.bytes.max += value.bytes.max;
         }
      }
      return totals;
   };
   
   // calculate totals as if keys are unique
   var calcUnique = function(data, skipKeyCounts)
   {
      var totals = {
         counts: {
            live: 0,
            dead: 0,
            max: 0
         },
         bytes: {
            live: 0,
            dead: 0,
            max: 0
         }
      };
      for(var key in data)
      {
         if(!skipKeyCounts || key != 'KeyCounts')
         {
            var value = data[key];
            totals.counts.live += (value.counts.live > 0) ? 1 : 0;
            totals.counts.dead += (value.counts.dead > 0) ? 1 : 0;
            totals.counts.max += 1;
            totals.bytes.live += value.bytes.live / value.counts.live;
            totals.bytes.dead += value.bytes.dead / value.counts.dead;
            totals.bytes.max += value.bytes.max / value.counts.max;
         }
      }
      return totals;
   };
   
   // make a stat row
   var makeRow = function(name, data)
   {
      var row = $('<tr/>');
      row.append('<td>' + name + '</td>');
      row.append('<td>' + data.counts.live + '</td>');
      row.append('<td>' + data.counts.dead + '</td>');
      row.append('<td>' + data.counts.max + '</td>');
      row.append('<td>' + data.bytes.live + '</td>');
      row.append('<td>' + data.bytes.dead + '</td>');
      row.append('<td>' + data.bytes.max + '</td>');
      return row;
   };

   var refreshNetwork = function(data)
   {
      $("#networkTemplate").tmpl(data).appendTo("#network");
   };

   var refreshDynoCounts = function(data)
   {
      var stats = $('#dyno-counts');
      
      stats.empty();
      
      for(var key in data)
      {
         if(key != 'KeyCounts')
         {
            stats.append(makeRow(key, data[key]));
         }
      }
      stats.append(makeRow('Total', calcTotal(data, true)));
      
      return false;
   };
   
   var refreshDynoKeyCounts = function(data)
   {
      var stats = $('#dyno-key-counts');
      
      stats.empty();
      
      data = ('KeyCounts' in data) ? data.KeyCounts.keys : {};
      for(var key in data)
      {
         stats.append(makeRow(key, data[key]));
      }
      stats.append(makeRow('Total', calcTotal(data, false)));
      stats.append(makeRow('Unique', calcUnique(data, false)));
      
      return false;
   };

   $('#refresh').click(function()
   {
      var status = $('#stats-status');
      
      status.text('Loading...');
      $('#network').empty();
      $('#dyno-counts').empty();
      $('#dyno-key-counts').empty();
      
      $.ajax(
      {
         type: 'GET',
         url: '/admin/statistics',
         dataType: 'json',
         success: function(data)
         {
            refreshNetwork(data.network || {});
            refreshDynoCounts(data.dyno || {});
            refreshDynoKeyCounts(data.dyno || {});
            status.text('Updated @ ' + new Date());         
         },
         error: function()
         {
            status.text('ERROR! @ ' + new Date());         
         }
      });
      
      return false;
   });

   $('#refresh').click();
});
