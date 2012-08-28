${set([
  pageTitle = "Set Password"
])}
{{partial "head.tpl"}}

<h2>${pageTitle}</h2>

<div class="block-inline w60 mr1 p10px box">
  {{partial "profile/password/password-form.tpl"}}
</div>
<div class="block-inline w30 ml1">
  <p>A secure password should use at least 8
  characters and a combination of upper and lower case letters,
  numbers and symbols.</p>
</div>

{{partial "foot.tpl"}}
