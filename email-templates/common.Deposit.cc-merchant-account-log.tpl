To: {{serviceDomain}}-merchant-account-logs@digitalbazaar.com
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} card deposit log ({{deposit.id}})

Merchant Name:               Digital Bazaar, Inc.
Merchant Location:           Blacksburg, VA, USA
Merchant Company URL:        http://digitalbazaar.com/
Merchant Service URL:        {{baseUri}}/
Transaction Amount:          ${{deposit.amount}} {{deposit.currency}}
Transaction Date:            {{deposit.created}}
Transaction Payment Type:    {{deposit.source.paymentMethod}}
Transaction ID:              {{deposit.id}}
Owner:                       {{deposit.source.owner}}
Card Brand:                  {{deposit.source.cardBrand}}
Card Number:                 {{deposit.source.cardNumber}}
Card Expiration:             {{deposit.source.cardExpMonth}}/{{deposit.source.cardExpYear}}
Payment Gateway:             {{deposit.source.paymentGateway}}
Authorization Approval Code: {{deposit.sysGatewayApprovalCode}}
Transaction Type:            purchase
Transaction Description:     {{serviceName}} deposit
Return/Refund Policy:        {{baseUri}}/legal#tos
