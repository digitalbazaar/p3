To: {{serviceDomain}}-merchant-account-logs@digitalbazaar.com
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} ACH deposit log ({{deposit.id}})

Merchant Name:               Digital Bazaar, Inc.
Merchant Location:           Blacksburg, VA, USA
Merchant Company URL:        http://digitalbazaar.com/
Merchant Service URL:        http://{{serviceDomain}}/
Transaction Amount:          ${{deposit.amount}} USD
Transaction Date:            {{deposit.created}}
Transaction Payment Type:    {{deposit.source.paymentMethod}}
Transaction ID:              {{deposit.id}}
Owner:                       {{deposit.source.owner}}
Bank Routing Number:         {{deposit.source.bankRoutingNumber}}
Bank Account Number:         {{deposit.source.bankAccount}}
ACH Gateway:                 {{deposit.source.paymentGateway}}
Authorization Approval Code: {{deposit.psaGatewayApprovalCode}}
Transaction Type:            purchase
Transaction Description:     {{serviceName}} deposit
Return/refund policy:        http://{{serviceDomain}}/legal#TermsOfService
