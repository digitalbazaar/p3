      {{! Avoid extra whitespace between elements for proper inline layout }}
      
      {{if pageLayout == "normal"}}
      <hr/>
      <footer class="footer row">
        <div class="span12">
          <ul>
            <li><a href="/">Home</a></li><!--
            --><li><a href="/about">About</a></li><!--
            --><li><a href="http://payswarm.com/wiki/faq">FAQ</a></li><!--
            --><li><a href="/docs">REST API</a></li><!--
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

    <script type="text/javascript" src="${cacheRoot}/async/async.${jsExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/spin/spin.${jsExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/bootstrap/js/bootstrap.${jsExt}"></script>
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
