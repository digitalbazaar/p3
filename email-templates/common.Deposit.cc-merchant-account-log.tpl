To: {{serviceDomain}}-merchant-account-logs@digitalbazaar.com
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} credit card deposit log ({{deposit.id}})

Merchant Name:               Digital Bazaar, Inc.
Merchant Location:           Blacksburg, VA, USA
Merchant Company Address:    http://digitalbazaar.com/
Merchant Online Address:     http://{{serviceDomain}}/
Transaction Amount:          ${{deposit.amount}} USD
Transaction Date:            {{deposit.created}}
Transaction Payment Type:    {{deposit.source.cardBrand}}
Transaction ID:              {{deposit.id}}
Purchaser:                   {{deposit.source.owner}}
ACH Gateway:                 {{deposit.source.paymentGateway}}
Authorization Approval Code: {{deposit.psaGatewayApprovalCode}}
Transaction type:            purchase
Description of merchandise:  {{serviceName}} deposit
Return/refund policy:        http://{{serviceDomain}}/legal#TermsOfService
