To: {{service.domain}}-merchant-account-logs@digitalbazaar.com
From: "{{service.name}} {{system.name}}" <{{system.email}}>
Subject: {{subject.prefix}}{{service.name}} ACH deposit log ({{deposit.id}})

Merchant Name:               Digital Bazaar, Inc.
Merchant Location:           Blacksburg, VA, USA
Merchant Company URL:        http://digitalbazaar.com/
Merchant Service URL:        {{baseUri}}/
Deposit Amount:              ${{amount}} {{deposit.currency}}
Transaction Amount:          ${{deposit.amount}} {{deposit.currency}}
Transaction Date:            {{deposit.created}}
Transaction Payment Type:    {{deposit.source.paymentMethod}}
Transaction ID:              {{deposit.id}}
Owner:                       {{deposit.source.owner}}
Bank Routing Number:         {{deposit.source.bankRoutingNumber}}
Bank Account Number:         {{deposit.source.bankAccount}}
ACH Gateway:                 {{deposit.source.paymentGateway}}
Authorization Approval Code: {{deposit.sysGatewayApprovalCode}}
Transaction Type:            purchase
Transaction Description:     {{service.name}} deposit
Return/Refund Policy:        {{baseUri}}/legal#tos
