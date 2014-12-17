To: {{service.domain}}-merchant-account-logs@digitalbazaar.com
From: "{{service.name}} {{system.name}}" <{{system.email}}>
Subject: {{subject.prefix}}{{service.name}} ACH withdrawal log ({{withdrawal.id}})

Merchant Name:               Digital Bazaar, Inc.
Merchant Location:           Blacksburg, VA, USA
Merchant Company URL:        http://digitalbazaar.com/
Merchant Service URL:        {{baseUri}}/
Withdrawal Amount:           ${{amount}} {{withdrawal.currency}}
Transaction Total:           ${{withdrawal.amount}} {{withdrawal.currency}}
Transaction Date:            {{withdrawal.created}}
Transaction Payment Type:    {{withdrawal.destination.paymentMethod}}
Transaction ID:              {{withdrawal.id}}
Owner:                       {{withdrawal.destination.owner}}
Bank Routing Number:         {{withdrawal.destination.bankRoutingNumber}}
Bank Account Number:         {{withdrawal.destination.bankAccount}}
ACH Gateway:                 {{withdrawal.destination.paymentGateway}}
Authorization Approval Code: {{withdrawal.sysGatewayApprovalCode}}
Transaction Type:            credit
Transaction Description:     {{service.name}} withdrawal
Return/Refund Policy:        {{baseUri}}/legal#tos
