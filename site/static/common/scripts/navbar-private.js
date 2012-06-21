/*!
 * Navbar
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

// state for grabbing popover when getting placement
var tp = null;
var $popover = null;

$(document).ready(function() {

  // configure popover
  $('#popover-profile-button').popover({
    placement: getPopoverPlacement,
    trigger: 'manual',
    title: window.data.session.profile.label,
    content: $.tmpl('navbar-hovercard-tmpl', {
      profile: data.session.profile,
      identity: data.session.identity,
      identities: data.session.identities
    }).html()
  });

  // bind button to launch popover
  $('#popover-profile-link').click(function(e) {
    $('#popover-profile-button').click();
    return false;
  });
  $('#popover-profile-button').click(function(e) {
    e.stopPropagation();

    // toggle button state and popover
    var $self = $(this);
    $self.button('toggle');
    $self.popover('toggle');
    if(tp !== null) {
      // custom position popover
      $popover.css(tp);
      tp = null;

      // bind identity switcher
      $('#switch-identity').click(function(e) {
        e.preventDefault();
        $self.popover('hide');
        $self.button('toggle');
        window.modals.switchIdentity.show();
      });
    }
  });
  // hide popover when clicking away
  $(document).click(function(e) {
    if($popover !== null && $(e.target).closest($popover).length === 0) {
      var $button = $('#popover-profile-button');
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
  var pos = this.getPosition(inside);
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
