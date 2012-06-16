To: {{html profile["foaf:mbox"]}}
From: "{{html serviceName}} Customer Support" <support@{{html supportDomain}}>
Subject: {{html profileSubjectPrefix}}{{html serviceName}} deposit successful

{{if productionMode == false}}
*******
NOTE: This is a demonstration website notification and no real money was involved. More info is available at http://payswarm.com/wiki/Demo_Warning.
*******

{{/if}}
Hello {{html profile["rdfs:label"]}},

A charge in the amount of USD {{html "$"}}{{html deposit["com:amount"]}} has been charged to your credit card. Here is your deposit receipt:

Transaction ID : {{html deposit["@id"]}}
Date and Time  : {{html deposit["com:date"]}}
{{each(idx,transfer) deposit["com:transfer"]}}
{{if transfer["rdfs:comment"] == "Deposit"}}{{! FIXME: need a better check for profiles target account}}
{{html serviceName}} Account: {{html transfer["com:destination"]}}{{! FIXME: append "({ {html ...destinationAccountName} })"}}
{{/if}}
{{/each}}

Credit Card Information:
   Name  : {{html deposit["com:source"]["ccard:name"]}}
   Type  : {{html deposit["com:source"]["ccard:brand"]}}
   Number: {{html deposit["com:source"]["ccard:number"]}}
   Exp   : {{html deposit["com:source"]["ccard:expMonth"]}}/{{html deposit["com:source"]["ccard:expYear"]}}
   Charge: USD {{html "$"}}{{html deposit["com:amount"]}}

Deposit Information:
{{each(idx,transfer) deposit["com:transfer"]}}
   {{html transfer["rdfs:comment"]}}: USD {{html "$"}}{{html transfer["com:amount"]}}
{{/each}}

Now that you've deposited money into your account, you can use PaySwarm at many fine services. You can always view your latest activity on your profile page.

https://{{html serviceDomain}}/profile/financial/activity

If you have any questions or comments please contact support@{{html supportDomain}}.

Digital Bazaar, Inc.
Blacksburg, VA, USA
