${set(pageTitle = "Transaction Info")}
{{partial "head.tpl"}}

<h2>${transactionType} Summary</h2>

<table>
<tr><td>Date</td><td>${transaction.created}</td></tr>
{{if transaction.voided}}
<tr><td>Voided</td><td>${transaction.voided}</td></tr>
<tr><td>Void Reason</td><td>
  {{if transaction.voidReason === "payswarm.paymentGateway.Declined"}}
    Transaction declined by the external payment gateway.
  {{else}}
    ${transaction.voidReason}
  {{/if}}
</td></tr>
{{/if}}
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
{{/if}}
{{each(idx,transfer) transfers}}
<tr>
  <td>{{if idx == 0}}Transfers{{else}}&nbsp;{{/if}}</td>
  <td>
    <i class="icon-info-sign" title="Details"></i> ${transfer.comment}<br/>
    <i class="icon-minus" title="Source"></i>
    <span class="money right" title="USD $${transfer.amount}">
      $ ${transfer.amount}
    </span> from
    {{if transfer.source === "urn:payswarm-external-account"}}
      ${transaction.source.label}
      {{if transaction.source.paymentMethod === "ccard:CreditCard"}}
        (${transaction.source.cardNumber}) 
      {{else transaction.source.paymentMethod === "bank:BankAccount"}}
        (${transaction.source.bankAccount})
      {{/if}}
      <br/>
    {{else}}
    <a href="${transfer.source}">${transfer.source}</a><br/>
    {{/if}}
    <i class="icon-plus" title="Destination Account"></i>
    <span class="money right" title="USD $${transfer.amount}">
      $ ${transfer.amount}
    </span> to 
    {{if transfer.destination === "urn:payswarm-external-account"}}
      ${transaction.destination.label}
      {{if transaction.destination.paymentMethod === "ccard:CreditCard"}}
        (${transaction.destination.cardNumber}) 
      {{else transaction.destination.paymentMethod === "bank:BankAccount"}}
        (${transaction.destination.bankAccount})
      {{/if}}
      <br/>
    {{else}}
    <a href="${transfer.destination}">${transfer.destination}</a><br/>
    {{/if}}
</tr>
{{/each}}
</table>

{{partial "foot.tpl"}}