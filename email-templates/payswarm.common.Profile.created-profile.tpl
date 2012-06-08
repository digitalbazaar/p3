To: {{html identity["foaf:mbox"]}}
From: {{html serviceName}} Customer Support" <support@{{html supportDomain}}>
Subject: {{html profileSubjectPrefix}}Congratulations on joining {{serviceName}}!

{{if productionMode == false}}
*******
NOTE: This is a demonstration website notification. More info is available at http://payswarm.com/wiki/Demo_Warning.
*******
{{/if}}

Hello {{html identity["rdfs:label"]}},

Congratulations on joining {{html serviceName}}! Your profile has been created.

You can manage your identity here:
{{identity["@id"]}}/dashboard

We'd love to hear any feedback you have about {{html serviceName}}. Just send an email to comments@{{html supportDomain}}.

If you have any questions or comments please contact support@{{html supportDomain}}.
