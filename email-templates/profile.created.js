module.exports = {
  from: '{{each(idx,adr) from}}{{html adr.text}}<{{html adr.email}}>{{/each}}',
  to: '{{each(idx,adr) to}}{{html adr.text}}<{{html adr.email}}>{{/each}}',
  cc: '{{each(idx,adr) cc}}{{html adr.text}}<{{html adr.email}}>{{/each}}',
  subject: 'The subject: {{html subject}}',
  text: '\
    This is a template with the var {{html foo}}.\
    ',
  html: '\
    <html>This is a template with the var ${foo}</html>\
    '
};
