To: {{html serviceDomain}}-credit-card-logs@digitalbazaar.com
From: cluster@{{html supportDomain}}
Subject: {{html subjectPrefix}}{{html serviceName}} credit card charge log ({{html deposit.id}}

Merchant Name:               Digital Bazaar, Inc.
Merchant Location:           Blacksburg, VA, USA
Merchant Online Address:     http://digitalbazaar.com/
Merchant Online Address:     http://{{html serviceDomain}}/
Transaction Amount:          USD ${{html deposit.amount}}
Transaction Date:            {{html deposit.created}}
Transaction Payment Type:    {{html deposit.source.cardBrand}}
Transaction ID:              {{html deposit.id}}
Purchaser Name:              {{html deposit.source.cardName}}
Credit Card Gateway:         {{html deposit.paymentGateway}}
Authorization Approval Code: {{html deposit.psaAuthorizationApprovalCode}}
Transaction type:            purchase
Description of merchandise:  {{html serviceName}} deposit
Return/refund policy:        http://{{html serviceDomain}}/legal#TermsOfService
