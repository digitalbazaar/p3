To: notify@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} PaymentToken unverified for {{identity.id}}

-----BEGIN PROFILE-----
{{toJson(profile)}}
-----END PROFILE-----
-----BEGIN IDENTITY-----
{{toJson(identity)}}
-----END IDENTITY-----
-----BEGIN PAYMENT TOKEN-----
{{toJson(paymentToken)}}
-----END PAYMENT TOKEN-----
{%- if verify %}
-----VERIFY DATA-----
{{toJson(verify)}}
-----END VERIFY DATA-----
{% endif -%}
