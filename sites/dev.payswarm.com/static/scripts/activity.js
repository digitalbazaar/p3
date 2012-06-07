/*!
 * Account Activity Support
 *
 * @requires jQuery v1.7+ (http://jquery.com/)
 *
 * @author David I. Lehn
 */
(function($) {

$(document).ready(function()
{
  $('.expand').each(function(i, link) {
    $(link).click(function() {
      $("." + $(link).attr("data-details")).toggle();
      return false;
    });
  });
});

})(jQuery);
