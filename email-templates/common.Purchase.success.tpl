To: {{contracts.email}}
From: "{{service.name}} {{system.name}}" <{{system.email}}>
Subject: {{subject.prefix}}{{service.name}} Purchase for "{{contract.asset.title}}" from {{contract.assetProvider.label}}

Machine:        {{machine}}
Transaction ID: {{contract.id}}
Date:           {{contract.created}}
Amount:         {{contract.currency}} ${{contract.amount}}
Asset ID:       {{contract.asset.id}}
Asset Title:    {{contract.asset.title}}
Asset Content:  {{contract.asset.assetContent}}
Acquirer ID:    {{contract.assetAcquirer.id}}
Provider ID:    {{contract.assetProvider.id}}
Vendor ID:      {{contract.vendor.id}}

================================ Contract ===================================
{{toJson(contract)}}
