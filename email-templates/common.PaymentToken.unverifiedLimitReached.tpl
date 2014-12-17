To: {{notify.email}}
From: "{{service.name}} {{system.name}}" <{{system.email}}>
Subject: {{subject.prefix}}{{service.name}} Unverified PaymentToken limit reached

Machine:     {{machine}}
Token Limit: {{limit}}

================================ Error ===================================
{{toJson(error)}}
