PaySwarm Authority
==================

An implementation of a [PaySwarm][] authority.

[PaySwarm]: http://payswarm.com/ "PaySwarm Standard"

Copyright (c) 2011-2013 Digital Bazaar, Inc. All rights reserved.

Building the Software
=====================

1. npm install

Running the Development PaySwarm Authority
==========================================

1. npm run dev

Running the Tests
=================

1. npm run tests

Running the Code Coverage Tool
==============================

1. npm run coverage
2. Look at 'coverage.html' using a web browser

Minimizing the RequireJS client-side JS
=======================================

1. npm run minify
2. To test in dev mode, change:

<script data-main="/app/main.${jsExt}" ...

To:

<script data-main="/app/main.min.js" ...
