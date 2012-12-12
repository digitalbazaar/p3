To: contracts@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} Purchase for "{{contract.asset.title}}" from {{contract.assetProvider.label}}

Title:          {{contract.asset.title}}
Content:        {{contract.asset.assetContent}}
Amount:         USD ${{contract.amount}}
Date:           {{contract.created}}
Buyer:          {{contract.assetAcquirer.id}}
Vendor:         {{contract.assetProvider.id}}
Transaction ID: {{contract.id}}
Machine:        {{machine}}

================================ Contract ===================================
{{toJson(contract)}}
