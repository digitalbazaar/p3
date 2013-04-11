To: {{serviceDomain}}-merchant-account-logs@digitalbazaar.com
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} ACH withdrawal log ({{withdrawal.id}})

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
Authorization Approval Code: {{withdrawal.psaGatewayApprovalCode}}
Transaction Type:            credit
Transaction Description:     {{serviceName}} withdrawal
Return/Refund Policy:        {{baseUri}}/legal#tos
