To: deposits@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} deposit: USD ${{deposit.amount}} ({{deposit.id}})

Machine        : {{machine}}
Transaction ID : {{deposit.id}}
Date           : {{deposit.created}}
Charge         : USD ${{deposit.amount}}

{% if httpHeaders != null %}
============================== HTTP Headers ================================
{{httpHeaders}}
{% endif -%}
=============================== Requestor ==================================
{{profileJson}}
================================ Deposit ===================================
{{depositJson}}
