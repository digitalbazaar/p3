To: {{notify.email}}
From: "{{service.name}} {{system.name}}" <{{system.email}}>
Subject: {{subject.prefix}}{{service.name}} intervention required for {{transactionId}}

Machine:        {{machine}}
Transaction ID: {{transactionId}}

Too many external status checks have been performed without an adequate
settled/voided response for the transaction with the above ID. Intervention
is required to deal with this transaction.

A status check is performed via a payment gateway's API to see if a transaction
has been settled or voided by an external monetary system. A limit is placed
on these automated checks to ensure that transactions are finishing in a
timely fashion and to prevent overuse of an external API that may cost money.

The maximum number of external status checks (with a payment gateway)
has been exceeded for the transaction with the above ID.
