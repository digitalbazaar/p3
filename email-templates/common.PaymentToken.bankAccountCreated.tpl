To: notify@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} PaymentToken Bank Account created for {{identity.id}}

-----BEGIN IDENTITY-----
{{toJson(identity)}}
-----END IDENTITY-----
-----BEGIN PAYMENT TOKEN-----
{{toJson(paymentToken)}}
-----END PAYMENT TOKEN-----
