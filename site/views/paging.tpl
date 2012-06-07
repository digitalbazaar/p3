{{if pagingInfo.pages > 1}}
<div class="pagination pagination-centered">
  <ul>
    {{if pagingInfo.hasPrev}}
    <li><a href="${pagingUrl}?{{if pagingInfo.pagePrev != 1}}page=${pagingInfo.pagePrev}&amp;{{/if}}num=${pagingInfo.resPerPage}{{if pagingInfo.dtstart}}&amp;dtstart=${pagingInfo.dtstart}{{/if}}{{if pagingInfo.dtend}}&amp;dtend=${pagingInfo.dtend}{{/if}}">&#171;</a></li>
    {{else}}
    <li class="disabled"><a href="#">&#171;</a></li>
    {{/if}}
  
    {{if pagingInfo.pageStart > 1}}
    <li><a href="${pagingUrl}?page=1&amp;num=${pagingInfo.resPerPage}{{if pagingInfo.dtstart}}&amp;dtstart=${pagingInfo.dtstart}{{/if}}{{if pagingInfo.dtend}}&amp;dtend=${pagingInfo.dtend}{{/if}}">1</a></li>
    {{if pagingInfo.pageStart > 2}}
    <a href="#">...</a>
    {{/if}}
    {{/if}}
  
    {{each(currPage,number) pagingInfo.pageNumbers}}
    {{if currPage == pagingInfo.page}}
    <li class="active"><a href="#">${currPage}</a></li>
    {{else}}
    <li><a href="{pagingUrl}?page={currPage}&amp;num={pagingInfo.resPerPage}{:if pagingInfo.dtstart}&amp;dtstart={pagingInfo.dtstart}{:end}{:if pagingInfo.dtend}&amp;dtend={pagingInfo.dtend}{:end}">{currPage}</a></li>
    {{/if}}
    {{/each}}
  
    {{if pagingInfo.pages > pagingInfo.pageEnd}}
    {{if pagingInfo.pages-1 > pagingInfo.pageEnd}}
    <a href="#">...</a>
    {{/if}}
    <li><a href="{pagingUrl}?page={pagingInfo.pages}&amp;num={pagingInfo.resPerPage}{:if pagingInfo.dtstart}&amp;dtstart={pagingInfo.dtstart}{:end}{:if pagingInfo.dtend}&amp;dtend={pagingInfo.dtend}{:end}">{pagingInfo.pages}</a></li>
    {{/if}}
  
    {{if pagingInfo.more}}
    <a href="#">...</a>
    {{/if}}
  
    {{if pagingInfo.hasNext}}
    <li><a href="{pagingUrl}?page={pagingInfo.pageNext}&amp;num={pagingInfo.resPerPage}{:if pagingInfo.dtstart}&amp;dtstart={pagingInfo.dtstart}{:end}{:if pagingInfo.dtend}&amp;dtend={pagingInfo.dtend}{:end}">&#187;</a></li>
    {{else}}
    <li class="disabled"><a href="#">&#187;</a></li>
    {{/if}}
  </ul>
</div>
{{/if}}
