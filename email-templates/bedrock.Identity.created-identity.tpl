To: {{identity.email}}
From: "{{service.name}} {{support.name}}" <{{support.email}}>
Subject: {{subject.identityPrefix}}Welcome to {{service.name}}!

{% if productionMode == false %}
*******
NOTE: This is a demonstration website notification.
More info is available at https://payswarm.com/wiki/Demo_Warning.
*******

{% endif -%}
Hello {{identity.label}},

Welcome to {{service.name}}!

We're so glad you joined! Please let us know if there is anything that we
can do to help you settle into the website.

{{service.name}} is a demo website for testing out PaySwarm. If you're a
developer, feel free to check out the API documentation here:

{{baseUri}}/docs

You can manage your identity, financial accounts, credit/debit cards, bank
accounts, and other settings by going here:

{{identity.id}}/dashboard

We'd love to hear any feedback you have about {{service.name}}.
Just send an email to {{comments.email}}.

If you have any questions or comments please contact {{support.email}}.
