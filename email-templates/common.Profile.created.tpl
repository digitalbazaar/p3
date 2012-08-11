To: registration@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} Profile created: {{profile.psaSlug}} ({{profile.id}})

-----BEGIN PROFILE-----
{{toJson(profile)}}
-----END PROFILE-----
-----BEGIN IDENTITY-----
{{toJson(identity)}}
-----END IDENTITY-----
-----BEGIN ACCOUNT-----
{{toJson(account)}}
-----END ACCOUNT-----
