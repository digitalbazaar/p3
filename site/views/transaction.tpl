${set(pageTitle = "Transaction Info")}
{{partial "site/head.tpl"}}

<h2>{{if isContract}}Contract {{/if}}Summary</h2>

<table>
<tr><td>Date</td><td>${transaction.created}</td></tr>
<tr><td>Total Amount</td><td class="money">
    <span class="money right" title="USD $${transaction.amount}">
      $ ${transaction.amount}</span>
    </span>
  </td></tr>
{{if isContract}}
<tr><td>Asset</td><td>
  <a href="${asset.assetContent}">${asset.title}</a> by 
  ${asset.creator.fullName}</td></tr>
<tr><td>License</td><td><pre>${license.licenseTemplate}</pre></td></tr>
{{each(idx,transfer) transfers}}
<tr>
  <td>{{if idx == 0}}Transfers{{else}}&nbsp;{{/if}}</td>
  <td>
    <i class="icon-info-sign" title="Details"></i> ${transfer.comment}<br/>
    {{! FIXME: support more than credit cards }}
    <i class="icon-minus" title="Source"></i>
    <span class="money right" title="USD $${transfer.amount}">
      $ ${transfer.amount}
    </span> from
    <a href="${transfer.source}">${transfer.source}</a><br/>
    <i class="icon-plus" title="Destination Account"></i>
    <span class="money right" title="USD $${transfer.amount}">
      $ ${transfer.amount}
    </span> to 
    <a href="${transfer.destination}">${transfer.destination}</a>
</tr>
{{/each}}
{{/if}}

</table>

{{partial "site/foot.tpl"}}