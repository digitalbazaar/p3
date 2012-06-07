      {{! Avoid extra whitespace between elements for proper inline layout }}
      
      {{if pageLayout == "normal"}}
      <hr/>
      <footer class="footer row">
        <div class="span12">
          <ul>
            <li><a href="/">Home</a></li><!--
            --><li><a href="/about">About</a></li><!--
            --><li><a href="http://payswarm.com/wiki/faq">FAQ</a></li><!--
            --><li><a href="/legal#tos">Terms of Service</a></li><!--
            --><li><a href="/legal#pp">Privacy Policy</a></li><!--
            --><li><a href="/contact">Contact</a></li><!--
            --><li><a href="http://digitalbazaar.com/blog">Blog</a></li>
          </ul>
        </div>
        <div class="span12">
          <ul>
            <li><!--
              -->PaySwarm &#169;
              <span about="http://digitalbazaar.com/contact#company" 
                typeof="vcard:VCard commerce:Business gr:BusinessEntity" 
                property="rdfs:label vcard:fn gr:legalName"><a href="http://digitalbazaar.com/">Digital Bazaar, Inc.</a></span>
                All rights reserved.<!--
            --></li>
          </ul>
        </div>
      </footer>
      {{else}}
      <footer class="footer row">
        <div class="span12">
          <ul>
            <li><a href="/legal#tos">Terms of Service</a></li><!--
            --><li><a href="/legal#pp">Privacy Policy</a></li><!--
            --><li><!--
              -->PaySwarm &#169;
              <span about="http://digitalbazaar.com/contact#company" 
                typeof="vcard:VCard commerce:Business gr:BusinessEntity" 
                property="rdfs:label vcard:fn gr:legalName"><a href="http://digitalbazaar.com/">Digital Bazaar, Inc.</a></span>
                All rights reserved.<!--
            --></li>
          </ul>
        </div>
      </footer>
      {{/if}}
    </div>

    <script type="text/javascript" src="${cacheRoot}/common/scripts/jquery.${jsExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/common/scripts/jquery.tmpl.${jsExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/common/scripts/jquery.cookie.${jsExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/common/scripts/async.${jsExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/common/scripts/template-loader.${jsExt}"></script>
    {{if templateMap}}
    <script type="text/javascript">window.templates.load({{html parsify(templateMap)}});</script>
    {{/if}}
    
    <script type="text/javascript" src="${cacheRoot}/common/scripts/json2.${jsExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/common/bootstrap/js/bootstrap.${jsExt}"></script>
    {{if jsList && jsList.length > 0}}
    {{each(idx, jsFile) jsList}}
    <script type="text/javascript" src="${cacheRoot}/${jsFile}.${jsExt}"></script>
    {{/each}}
    {{/if}}

    {{if session.loaded}}
    <script type="text/javascript">
    $.cookie('timezone', new Date().getTimezoneOffset());
    var currentSlug = '${session.identity["psa:slug"]}';
    $(document).ready(function() {
      $('#identity-selector').change(function() {
        var url = window.location.href;
        if(window.location.pathname.indexOf('/i') === 0) {
          var nextSlug = $('#identity-selector option:selected').data('slug');
          url = url.replace(
            '/i/' + encodeURIComponent(currentSlug),
            '/i/' + encodeURIComponent(nextSlug));
        }
        $('#identity-redirect').val(url);
        $('#switch-identity').submit();
      });
    });
    </script>
    {{/if}}

    {{! Analytics }}
    {{if analytics}}
      <script type="text/javascript">
        var _gaq = _gaq || [];
        _gaq.push(['_setAccount', 'UA-1539674-8']);
        _gaq.push(['_trackPageview']);
            (function() {
          var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
          ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
          var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
        })();
      </script>
    {{/if}}

  </body>
</html>
