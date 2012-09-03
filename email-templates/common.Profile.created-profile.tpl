To: {{profile.email}}
From: "{{serviceName}} Customer Support" <support@{{supportDomain}}>
Subject: {{profileSubjectPrefix}}Congratulations on joining {{serviceName}}!

{% if productionMode == false %}
*******
NOTE: This is a demonstration website notification. 
More info is available at http://payswarm.com/wiki/Demo_Warning.
*******

{% endif -%}
Hello {{identity.label}},

Congratulations on joining {{serviceName}}!

You can manage your identity here:

{{identity.id}}/dashboard

We'd love to hear any feedback you have about {{serviceName}}. 
Just send an email to comments@{{supportDomain}}.

If you have any questions or comments please contact support@{{supportDomain}}.
