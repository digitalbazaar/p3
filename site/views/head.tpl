<!DOCTYPE html>
<html prefix="
  xhv: http://www.w3.org/1999/xhtml/vocab#
  xsd: http://www.w3.org/2001/XMLSchema#
  rdfs: http://www.w3.org/2000/01/rdf-schema#
  dc: http://purl.org/dc/terms/
  foaf: http://xmlns.com/foaf/0.1/
  media: http://purl.org/media#
  com: http://purl.org/commerce#
  audio: http://purl.org/media/audio#
  gr: http://purl.org/goodrelations/v1#
  ps: http://purl.org/payswarm#
  sig: http://purl.org/signature#
  vcard: http://www.w3.org/2006/vcard/ns#
  v: http://rdf.data-vocabulary.org/#
  "{{! debug="true"}}>

  <head>
    <meta http-equiv="Content-Type" content="text/html;charset=utf-8" />
    <title>${siteTitle}{{if pageTitle}}: ${pageTitle}{{/if}}</title>
    <script type="text/javascript" src="${cacheRoot}/jquery/jquery.${jsExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/jquery-ui/js/jquery-ui.${jsExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/angular/angular.${jsExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/angular/angular-ui.${jsExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/modules/payswarm.${jsExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/modules/payswarm.directives.${jsExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/modules/payswarm.filters.${jsExt}"></script>
    <script type="text/javascript" src="${cacheRoot}/modules/payswarm.services.${jsExt}"></script>

    <link href="${cacheRoot}/bootstrap/css/bootstrap.${cssExt}" rel="stylesheet" type="text/css" />
    <link href="${cacheRoot}/bootstrap/css/bootstrap-responsive.${cssExt}" rel="stylesheet" type="text/css" />
    <link href="${cacheRoot}/jquery-ui/css/jquery-ui.${cssExt}" rel="stylesheet" type="text/css" />
    <!--[if IE]>
    <link href="${cacheRoot}/jquery-ui/css/jquery-ui.ie.${cssExt}" rel="stylesheet" type="text/css" />
    <![endif]-->
    <link href="${cacheRoot}/angular/angular-ui.${cssExt}" rel="stylesheet" type="text/css" />
    <link href="${cacheRoot}/css/custom.${cssExt}" rel="stylesheet" type="text/css" />
    <link href="${cacheRoot}/css/site.${cssExt}" rel="stylesheet" type="text/css" />
    <link href="${cacheRoot}/css/cc-logos.${cssExt}" rel="stylesheet" type="text/css" />
    {{if cssList && cssList.length > 0}}
    {{each(idx, cssFile) cssList}}
    <link href="${cacheRoot}/css/${cssFile}.${cssExt}" rel="stylesheet" type="text/css" />
    {{/each}}
    {{/if}}

    <link rel="shortcut icon" href="/favicon.ico" />
  </head>

  <body data-ng-app="payswarm">
    {{if session.auth}}
    {{partial "navbar-private.tpl"}}
    {{else}}
    {{partial "navbar-public.tpl"}}
    {{/if}}
    
    <div class="container ng-cloak">

      {{! Javascript warning }}
      <noscript>
        <div class="alert alert-error">
          <p>Javascript must be enabled to use this site.</p>
        </div>
      </noscript>
      
      {{partial "data.tpl"}}
