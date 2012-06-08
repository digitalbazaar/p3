To: {{html email}}
From: "{{html serviceName}} Customer Support" <support@{{html supportDomain}}>
Subject: {{html profileSubjectPrefix}}Your {{html serviceName}} pass code

Hello {{html profiles[0]["rdfs:label"]}},

{{if password}}
You requested a pass code so you could reset your {{html serviceName}} password. If
you did not make this request, simply ignore this email and your password
will not be changed.
{{else}}
You requested a pass code so you could verify your {{html serviceName}} email
address.
{{/if}}
You may visit the following page and enter your code manually:
https://{{html serviceDomain}}/profile/passcode

{{if profiles.length > 1}}
Since you have multiple profiles with the same email address, we sent you
pass codes for each one:
{{each(idx,profile) profiles}}

Profile  : {{html profile["psa:slug"]}}
Pass code: {{html profile["psa:passcode"]}}
{{/if}}
{else}}
Your pass code is: {{html profiles[0]["psa:passcode"]}}
{{/if}}

If you have any questions or comments please contact support@{{html supportDomain}}.
