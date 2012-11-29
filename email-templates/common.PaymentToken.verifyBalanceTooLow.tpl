To: notify@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} PaymentToken verify balance too low

Machine: {{machine}}
Account: {{account}}
{% if balance %}Balance: {{currency}} {{balance}}{% endif %}
