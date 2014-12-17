To: {{registration.email}}
From: "{{service.name}} {{system.name}}" <{{system.email}}>
Subject: {{subject.prefix}}{{service.name}} Account created: {{account.id}})

-----BEGIN ACCOUNT-----
{{toJson(account)}}
-----END ACCOUNT-----
