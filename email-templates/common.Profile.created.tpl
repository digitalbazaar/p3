To: registration@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} Profile created: {{identity.sysSlug}} ({{identity.id}})

Machine:        {{machine}}
Profile ID:     {{identity.id}}
Profile Email:  {{identity.email}}
Identity ID:    {{identity.id}}
Identity Label: {{identity.label}}

-----BEGIN IDENTITY-----
{{toJson(identity)}}
-----END IDENTITY-----
-----BEGIN ACCOUNT-----
{{toJson(account)}}
-----END ACCOUNT-----
