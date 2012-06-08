To: {{html serviceDomain}}-credit-card-logs@digitalbazaar.com
From: cluster@{{html supportDomain}}
Subject: {{html subjectPrefix}}{{html serviceName}} credit card charge log ({{html deposit["@id"]}}

Merchant Name:               Digital Bazaar, Inc.
Merchant Location:           Blacksburg, VA, USA
Merchant Online Address:     http://digitalbazaar.com/
Merchant Online Address:     http://{{html serviceDomain}}/
Transaction Amount:          USD ${{html deposit["com:amount"]}}
Transaction Date:            {{html deposit["com:date"]}}
Transaction Payment Type:    {{html deposit["com:source.ccard:brand"]}}
Transaction ID:              {{html deposit["@id"]}}
Purchaser Name:              {{html deposit["com:source.ccard:name"]}}
Credit Card Gateway:         {{html deposit["com:gateway"]}}
Authorization Approval Code: {{html deposit["psa:authorizationApprovalCode"]}}
Transaction type:            purchase
Description of merchandise:  {{html serviceName}} deposit
Return/refund policy:        http://{{html serviceDomain}}/legal#TermsOfService
