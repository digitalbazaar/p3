To: contracts@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} Purchase for "{{contract.asset.title}}" from {{contract.assetProvider.label}}

Asset:          {{contract.asset.id}}
Title:          {{contract.asset.title}}
Content:        {{contract.asset.assetContent}}
Amount:         {{contract.currency}} ${{contract.amount}}
Date:           {{contract.created}}
Buyer:          {{contract.assetAcquirer.id}}
Provider:       {{contract.assetProvider.id}}
Vendor:         {{contract.vendor.id}}
Transaction ID: {{contract.id}}
Machine:        {{machine}}

================================ Contract ===================================
{{toJson(contract)}}
