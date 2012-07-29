/*!
 * Transmits input from a field to another place in the DOM.
 *
 * @requires jQuery v1.2 or later (http://jquery.com/)
 *
 * @author Dave Longley
 */

// create root website object if needed
window.website = window.website || {};

(function($) {

/**
 * Sets up all transmitter elements within a target.
 * 
 * @param target the target container element.
 */
window.website.setupTransmitters = function(target) {
  $('.tx', target).each(function(i, element) {
    var e = $(element);
    var tx = e.attr('data-tx');
    if(tx) {
      var replace = function() {
        $('[data-tx-from="' + tx + '"]', target).each(function() {
          // FIXME: support other encodings?
          $this = $(this);
          var value = e.val();
          var classes = ($this.attr('class') || '').split(/\s+/);
          $.each(classes, function() {
            switch(this.toString()) {
            case 'lowercase':
              value = value.toLowerCase();
              break;
            case 'url-encode':
              value = encodeURIComponent(value);
              break;
            case 'slug':
              // replace spaces with dashes, lower case and URI encode
              value = encodeURIComponent(
                value.replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
                .toLowerCase());
              break;
            }
          });
          
          // use placeholder if value is blank
          if(value === '' && $this.attr('data-tx-placeholder')) {
            value = $this.attr('data-tx-placeholder');
          }
          
          // FIXME: this conditional only works for input form elements
          // FIXME: only replace element content if transmitter is non-empty
          if($this.is('input')) {
            $this.val(value);
            $this.trigger('change');
          }
          else {
            $this.text(value);
            $this.trigger('change');
          }
        });
      };
      e.keyup(replace);
      e.keydown(replace);
      e.focus(replace);
      e.change(replace);
      //e.hover(replace);
      
      // do initial replacement
      replace();
    }
  });  
};

$(document).ready(function() {
  // setup all transmitter elements
  window.website.setupTransmitters();
});

})(jQuery);
