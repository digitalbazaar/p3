/*!
 * Management Support
 *
 * @requires jQuery v1.7 or later (http://jquery.com/)
 *
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 */
$(document).ready(function()
{
   // logging category
   var cat = 'payswarm.manage';

   $('.resource-add-form-toggle').click(function() {
      // FIXME: use better scoping for which form to toggle
      //var resource = $(this).closest('.resource');
      //$('.resource-add-form', resource).toggle();
      $('.resource-add-form').toggle();
   });
   
   var escapeSelector = function(sel)
   {
      // FIXME: support full escaping
      return sel.replace(':','\\:');
   };
   
   $('.resource-edit').click(function() {
      var resource = $(this).closest('.resource');
      var id = resource.attr('about');
      var types = resource.attr('typeof').split(' ');
      // FIXME: support multiple types
      var type = escapeSelector(types[0]);
      var editorId =
         $('span[about="' + type + '"][rel="psa\\:editor"]').attr('resource');
      editorId = escapeSelector(editorId);
      $(editorId).tmpl({}).appendTo(resource);
      $(resource).trigger('open-editor');
   });
   
   // generic deletion of paged resource views
   // calls DELETE on {location}/{resource-id} and updates UI
   $(document).on('click', '.resource-delete', function() {
      // element
      var resource = $(this).closest('.resource');
      // resource id, construct from short-id if needed
      /*
      var id = resource.data('id');
      if(!id)
      {
         var shortId = resource.data('shortId');
         if(shortId)
         {
            id = window.location.pathname + '/' + encodeURIComponent(shortId);
         }
      }
      */
      // FIXME
      var id = resource.attr('about');
      if(id)
      {
         // FIXME
         //id = window.location.pathname + '/' + encodeURIComponent(id);
         $.ajax({
            url: id,
            type: 'DELETE',
            success: function() {
               resource.fadeOut(function() {
                  resource.remove();
                  $('#resources-end')
                     .text(parseInt($('#resources-end').text())-1);
                  $('#resources-total')
                     .text(parseInt($('#resources-total').text())-1);
                  if($('.resources').children().length == 0)
                  {
                     $('.hasresources,.resources').hide();
                     $('.noresources').show();
                  }
               });
            }
         });
      }
      // FIXME: if no id, error
      return false;
   });
});
