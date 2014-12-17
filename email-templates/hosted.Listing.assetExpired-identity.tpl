To: {{identity.email}}
From: "{{service.name}} {{support.name}}" <{{support.email}}>
Subject: {{subject.identityPrefix}}{{service.name}} listing asset expired

{% if productionMode == false %}
*** NOTE ***
This is a demonstration website notification and no real money was involved.
More info is available at https://payswarm.com/wiki/Demo_Warning.
*** NOTE ***

{% endif -%}
An asset that you have listed for sale has expired. Please log in and change
or remove the listing.

Asset Title:     {{asset.title}}
Asset Creator:   {{asset.creator.name}}
Asset Content:   {{asset.assetContent}}
Asset Expired:   {{asset.listingRestrictions.validUntil}}
Your Listing ID: {{listing.id}}
