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

    <link href="${cacheRoot}/common/bootstrap/css/bootstrap.${cssExt}" rel="stylesheet" type="text/css" />
    <link href="${cacheRoot}/common/bootstrap/css/bootstrap-responsive.${cssExt}" rel="stylesheet" type="text/css" />
    <link href="${cacheRoot}/style/custom.${cssExt}" rel="stylesheet" type="text/css" />
    <link href="${cacheRoot}/style/site.${cssExt}" rel="stylesheet" type="text/css" />

    <link rel="shortcut icon" href="/favicon.ico" />
  </head>

  <body>
    {{if session.auth}}
    {{partial "site/navbar-private.tpl"}}
    {{else}}
    {{partial "site/navbar-public.tpl"}}
    {{/if}}
    
    <div class="container">

      {{! Javascript warning }}
      <noscript>
        <div class="alert alert-error">
          <p>Javascript must be enabled to use this site.</p>
        </div>
      </noscript>
      
      {{partial "data.tpl"}}
