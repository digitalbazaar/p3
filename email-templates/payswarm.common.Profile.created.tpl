To: registration@{{html supportDomain}}
From: cluster@{{html supportDomain}}
Subject: {{html subjectPrefix}}{{html serviceName}} Profile created: {{html profile["psa:slug"]}} ({{html profile["@id"]}})

-----BEGIN PROFILE-----
{{html toJson(profile)}}
-----END PROFILE-----
-----BEGIN IDENTITY-----
{{html toJson(identity)}}
-----END IDENTITY-----
-----BEGIN ACCOUNT-----
{{html toJson(account)}}
-----END ACCOUNT-----
