To: {{notify.email}}
From: "{{service.name}} {{system.name}}" <{{system.email}}>
Subject: {{subject.prefix}}{{service.name}} PaymentToken Bank Account created for {{identity.id}}

-----BEGIN IDENTITY-----
{{toJson(identity)}}
-----END IDENTITY-----
-----BEGIN PAYMENT TOKEN-----
{{toJson(paymentToken)}}
-----END PAYMENT TOKEN-----
