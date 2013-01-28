      {{! Avoid extra whitespace between elements for proper inline layout }}
      
      {{if pageLayout == "normal"}}
      <hr/>
      {{/if}}
      <footer class="footer row">
        {{if pageLayout != "error"}}
        <div class="span12">
          <ul>
            {{if pageLayout == "normal"}}
            <li><a href="/">Home</a></li><!--
            --><li><a href="/about">About</a></li><!--
            --><li><a href="http://payswarm.com/wiki/faq">FAQ</a></li><!--
            --><li><a href="/help">Help</a></li><!--
            --><li><a href="/docs">REST API</a></li><!--
            --><li><a href="/legal#tos">Terms of Service</a></li><!--
            --><li><a href="/legal#pp">Privacy Policy</a></li><!--
            --><li><a href="/contact">Contact</a></li><!--
            --><li><a href="http://digitalbazaar.com/blog">Blog</a></li>
            {{else}}
            <li><a href="/help">Help</a></li><!--
            --><li><a href="/legal#tos">Terms of Service</a></li><!--
            --><li><a href="/legal#pp">Privacy Policy</a></li>
            {{/if}}
          </ul>
        </div>
        {{/if}}
        <div class="span12">
          <ul>
            <li><!--
              -->Copyright &#169; 2013
              <span about="http://digitalbazaar.com/contact#company" 
                typeof="vcard:VCard commerce:Business gr:BusinessEntity" 
                property="rdfs:label vcard:fn gr:legalName"><a href="http://digitalbazaar.com/">Digital Bazaar, Inc.</a></span>
                All rights reserved.<!--
            --></li>
          </ul>
        </div>
      </footer>
    </div>

    <script type="text/javascript" src="${cacheRoot}/async/async.${jsLibExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/spin/spin.${jsLibExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/bootstrap/js/bootstrap.${jsLibExt}"></script>
    {{if jsList && jsList.length > 0}}
    {{each(idx, jsFile) jsList}}
    <script type="text/javascript" src="${cacheRoot}/${jsFile}.${jsExt}"></script>
    {{/each}}
    {{/if}}

    {{! Analytics }}
    {{if googleAnalytics.enabled}}
      <script type="text/javascript">
        var _gaq = _gaq || [];
        _gaq.push(['_setAccount', '${googleAnalytics.account}']);
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
