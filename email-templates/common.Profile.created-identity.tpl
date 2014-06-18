To: {{identity.email}}
From: "{{serviceName}} Customer Support" <support@{{supportDomain}}>
Subject: {{identitySubjectPrefix}}Welcome to {{serviceName}}!

{% if productionMode == false %}
*******
NOTE: This is a demonstration website notification. 
More info is available at http://payswarm.com/wiki/Demo_Warning.
*******

{% endif -%}
Hello {{identity.label}},

Welcome to {{serviceName}}!

We're so glad you joined! Please let us know if there is anything that we
can do to help you settle into the website.

{{serviceName}} is for fans who love reading, watching, or listening to great 
content. We keep payments simple so that you can spend more time enjoying
other people's creations and they can earn an honest living building 
more cool stuff for you.

This site is also for makers who create digital content such as written 
stories, music, film, episodic content, photos, virtual goods, and documents. 
{{serviceName}} enables makers to distribute their creations through their 
own website and receive payment directly from their fans and customers. This 
greatly eases the burden of setting up and getting paid for great content on 
your website.

You can manage your identity, financial accounts, credit cards, bank accounts, 
and other settings by going here:

{{identity.id}}/dashboard

We'd love to hear any feedback you have about {{serviceName}}. 
Just send an email to comments@{{supportDomain}}.

If you have any questions or comments please contact support@{{supportDomain}}.
