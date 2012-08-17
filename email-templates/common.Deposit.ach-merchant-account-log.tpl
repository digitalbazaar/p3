To: {{serviceDomain}}-merchant-account-logs@digitalbazaar.com
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} ACH deposit log ({{deposit.id}})

Merchant Name:               Digital Bazaar, Inc.
Merchant Location:           Blacksburg, VA, USA
Merchant Company URL:        http://digitalbazaar.com/
Merchant Service URL:        http://{{serviceDomain}}/
Transaction Amount:          USD ${{deposit.amount}}
Transaction Date:            {{deposit.created}}
Transaction Payment Type:    {{deposit.source.cardBrand}}
Transaction ID:              {{deposit.id}}
Purchaser Name:              {{deposit.source.cardName}}
ACH Gateway:                 {{deposit.paymentGateway}}
Authorization Approval Code: {{deposit.psaAuthorizationApprovalCode}}
Transaction Type:            purchase
Description of merchandise:  {{serviceName}} deposit
Return/refund policy:        http://{{serviceDomain}}/legal#TermsOfService
