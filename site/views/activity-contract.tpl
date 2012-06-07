<tr id="t-${tnum}" >
  <td><span class="date">${contract["com:date"]}</span></td>
  <td><span class="name"><i class="icon-shopping-cart"></i> ${contract["ps:asset"]["dc:title"]}</span></td>
  <td class="money">
    <span class="money right" title="USD $${contract["com:amount"]}">
      <span class="currency">USD</span> $ ${contract["com:amount"]}
    </span>
  </td>
  <td class="action"><a class="btn btn-info expand" href="#" data-details="t-${tnum}-details" title="Details"><i class="icon-info-sign"></i></td>
</tr>

{{each(idx,transfer) contract["com:transfer"]}}
<tr class="t-${tnum}-details hide">
  <td>&nbsp;</td>
  <td>
    <i class="icon-info-sign" title="Details"></i> ${transfer["rdfs:comment"]}<br/>
    <i class="icon-minus" title="Source Account"></i> <a href="${transfer["com:source"]}">${transfer["com:source"]}</a><br/>
    <i class="icon-plus" title="Destination Account"></i> <a href="${transfer["com:destination"]}">${transfer["com:destination"]}</a>
  </td>
  <td class="money">
    <span class="money right" title="USD $${transfer["com:amount"]}">
      <span class="currency">USD</span> $ ${transfer["com:amount"]}
    </span>
  </td>
  <td>&nbsp;</td>
  {{! FIXME: content information }}
</tr>
{{/each}}
