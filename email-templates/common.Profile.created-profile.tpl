To: {{profile.email}}
From: "{{serviceName}} Customer Support" <support@{{supportDomain}}>
Subject: {{profileSubjectPrefix}}Welcome to {{serviceName}}!

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

{{serviceName}} is for fans who enjoy reading, viewing or listening to great 
content. We make sure to get payments out of your way so that you can enjoy 
great content while the people who made it earn an honest living building 
more cool stuff for you.

This site is also for makers who create digital content such as written 
stories, music, film, episodic content, photos, virtual goods, and documents. 
{{serviceName}} enables makers to distribute their creations through their 
own website and receive payment directly from their fans and customers. It 
greatly eases the burden of setting up and getting paid for great content on 
your website.

You can manage your profile, financial accounts, credit cards, bank accounts 
and other settings by going here:

{{identity.id}}/dashboard

We'd love to hear any feedback you have about {{serviceName}}. 
Just send an email to comments@{{supportDomain}}.

If you have any questions or comments please contact support@{{supportDomain}}.
