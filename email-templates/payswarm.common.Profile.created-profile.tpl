To: {{html profile.email}}
From: "{{html serviceName}} Customer Support" <support@{{html supportDomain}}>
Subject: {{html profileSubjectPrefix}}Congratulations on joining {{html serviceName}}!

{{if productionMode == false}}
*******
NOTE: This is a demonstration website notification. More info is available at http://payswarm.com/wiki/Demo_Warning.
*******

{{/if}}
Hello {{html identity.label}},

Congratulations on joining {{html serviceName}}! Your profile has been created.

You can manage your identity here:
{{html identity.id}}/dashboard

We'd love to hear any feedback you have about {{html serviceName}}. Just send an email to comments@{{html supportDomain}}.

If you have any questions or comments please contact support@{{html supportDomain}}.
