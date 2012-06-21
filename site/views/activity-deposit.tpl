<tr id="t-${tnum}" >
  <td><span class="date">${deposit["com:date"]}</span></td>
  <td><span class="name"><i class="icon-plus"></i> Deposit</span></td>
  <td class="money">
    <span class="money right" title="USD $${deposit.amount}">
      <span class="currency">USD</span> $ ${deposit.amount}
    </span>
  </td>
  <td class="action"><a class="btn btn-info expand" href="#" data-details="t-${tnum}-details" title="Details"><i class="icon-info-sign"></i></td>
</tr>

{{each(idx,transfer) deposit.transfer}}
<tr class="t-${tnum}-details hide">
  <td>&nbsp;</td>
  <td>
    <i class="icon-info-sign" title="Details"></i> ${transfer.comment}<br/>
    {{! FIXME: support more than credit cards }}
    <i class="icon-minus" title="Source"></i> <a href="${transfer.source}">External Source</a><br/>
    <i class="icon-plus" title="Destination Account"></i> <a href="${transfer.destination}">${transfer.destination}</a>
  </td>
  <td class="money">
    <span class="money right" title="USD $${transfer.amount}">
      <span class="currency">USD</span> $ ${transfer.amount}
    </span>
  </td>
  <td>&nbsp;</td>
  {{! FIXME: content information }}
</tr>
{{/each}}
