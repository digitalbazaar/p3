/*!
 * Public Navigation bar
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 * @author Manu Sporny
 */
(function($) {

// state for grabbing popover when getting placement
var tp = null;
var $popover = null;

$(document).ready(function() {
  
  // bind signin button
  $('#signin-button').bind('click', function() {
    $('#login').submit();
  });
  $('#login :input').bind('keypress', function(e) {
    if(e.which === 13) {
      $('#login').submit();
    }
  });

  // configure the sign-in popover
  $('#popover-signin-button').popover({
    placement: getPopoverPlacement,
    trigger: 'manual',
    title: "Profile Actions",
    content: $.tmpl('navbar-signin-popover-tmpl').html()
  });
  
  // bind button to launch popover
  $('#popover-signin-button').click(function(e) {
    e.stopPropagation();
    
    // toggle button state and popover
    var $self = $(this);
    $self.button('toggle');
    $self.popover('toggle');
    if(tp !== null) {
      // custom position popover
      $popover.css(tp);
      tp = null;
    }
  });
  // hide popover when clicking away
  $(document).click(function(e) {
    if($popover !== null && $(e.target).closest($popover).length === 0) {
      var $button = $('#popover-signin-button');
      if($button.hasClass('active')) {
        $button.button('toggle');
        $button.popover('toggle');
      }
    }
  });
});

/**
 * Hack to position popover onscreen for small screens and always with an
 * arrow on the right of the popover.
 * 
 * @param popover the popover element.
 * @param element the element that triggered the popover.
 * 
 * @return the placement for the popover.
 */
function getPopoverPlacement(popover, element) {
  $popover = $(popover);
  var $element = $(element);
  
  // get top position for popover
  var inside = false;
  $popover
    .remove()
    .css({ top: 0, left: 0, display: 'block' })
    .appendTo(inside ? $element : document.body);    
  var pos = this.getPosition($element);
  tp = {top: pos.top + pos.height};
  
  // calculate left position and position arrow
  var right = $element.offset().left + element.offsetWidth;
  tp.left = right - popover.offsetWidth;
  $('.arrow', $popover).css({
    left: popover.offsetWidth - element.offsetWidth / 2
  });
  
  return 'bottom';
}

})(jQuery);
