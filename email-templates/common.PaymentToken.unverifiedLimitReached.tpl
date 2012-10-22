To: notify@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} Unverified PaymentToken limit reached

Machine        : {{machine}}
Token limit    : {{limit}}

================================ Error ===================================
{{error|json_encode(2)}}
