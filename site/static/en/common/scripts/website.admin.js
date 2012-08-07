/*!
 * Management Support
 *
 * @requires jQuery v1.3 or later (http://jquery.com/)
 *
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 */
$(document).ready(function()
{
   // logging category
   var cat = 'payswarm.admin';

   $('#button-admin-remove-role').click(function() {
	   var roleId = $("#id").val();
      $.ajax({
         url: '/admin/roles/' + encodeURIComponent(roleId),
         type: 'DELETE',
         success: function() {
            // return to roles admin page
            window.location = '/admin/roles/';
         },
         error: function() {
         }
      });
      return false;
   });

   $('.select-all').change(function(event) {
      var val = $(this).attr('checked');
      if(val)
      {
         $('.select-single').each(function() {
            $(this).attr('checked', 'checked');
         });
      }
      else
      {
         $('.select-single').each(function() {
            $(this).removeAttr('checked');
         });
      }
   });

   $('#button-page-refresh').click(function() {
      pageRefresh();
   });

   var pageRefresh = function() {
      // FIXME: get JSON data to update page dynamically
      window.location = window.location;
   };
});
