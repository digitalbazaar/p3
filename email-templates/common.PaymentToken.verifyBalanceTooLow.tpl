To: {{notify.email}}
From: "{{service.name}} {{system.name}}" <{{system.email}}>
Subject: {{subject.prefix}}{{service.name}} PaymentToken verify balance too low

Machine: {{machine}}
Account: {{account}}
{% if balance %}Balance: {{currency}} {{balance}}{% endif %}
