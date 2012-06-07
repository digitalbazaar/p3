/*!
 * Switch Identity Modal
 *
 * @requires jQuery v1.6+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
(function($) {

var modals = window.modals = window.modals || {};

/**
 * Shows a modal to switches the identity in the current session.
 * 
 * Typical usage:
 * 
 * modals.switchIdentity.show({
 *   parent: $('#parent-modal') (optional),
 *   canceled: function() {}
 * });
 */
modals.switchIdentity = {};
modals.switchIdentity.show = function(options) {
  options = options || {};
  
  // load modal
  $('#modals-switch-identity').replaceWith(
    $.tmpl('modals-switch-identity-tmpl', {
      tmpl: window.tmpl,
      data: window.data,
      profile: window.data.session.profile      
  }));
  
  // set up modal
  var target = options.target = $('#modals-switch-identity');
  $('.btn-close', target).click(function() {
    hideSelf(options);
  });
  target.on('show', function() {
    if(options.parentModal) {
      options.parentModal.modal('hide');
    }
  });
  
  // install identity selector
  selectors.identity.install({
    target: $('#switch-identity-selector'),
    parentModal: target,
    addModal: true
  });
  
  // switch button clicked
  $('[name="button-switch-identity"]', target).click(function() {
    
    // if current url starts with '/i', switch to other identity's dashboard
    var identity = $('#switch-identity-selector')[0].selected;
    var redirect = window.location.href;
    if(window.location.pathname.indexOf('/i') === 0) {
      redirect = identity['@id'] + '/dashboard';
    }
    
    payswarm.switchIdentity({
      identity: $('#switch-identity-selector')[0].selected['@id'],
      redirect: redirect
    });
  });
  
  // show modal
  target.modal({backdrop: true});
};

function hideSelf(options) {
  options.target.modal('hide');
  if(options.canceled) {
    options.canceled();
  }
  if(options.parentModal) {
    options.parentModal.modal('show');
  }
}

})(jQuery);
