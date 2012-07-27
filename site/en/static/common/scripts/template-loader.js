/*!
 * Asynchronously loads jquery templates.
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

var templates = window.templates = window.templates || {};

/**
 * Asynchronously loads all templates in the given map and holds
 * the document ready event until complete.
 * 
 * @param map the map of template name => template URL to load.
 */
templates.load = function(map) {
  // load all scripts in the list
  for(var key in map) {
    (function(name, url) {
      $.holdReady(true);
      $.ajax({
        async: true,
        type: 'GET',
        url: url,
        dataType: 'html',
        success: function(response, statusText) {
          $.template(name, response);
        },
        complete: function() {
          $.holdReady(false);
        }
      });
    })(key, map[key]);
  }
};

})(jQuery);
