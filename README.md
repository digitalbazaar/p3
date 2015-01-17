PaySwarm Payment Processor (p3)
===============================

PaySwarm is the world's first implementation of a set
of technologies that make payments a core part of 
the Web.

This repository contains a reference implementation of 
a Web Payments Processor based on the specifications 
at: https://web-payments.org/specs/

P3 is a Web application and REST API service that can 
be used to deploy Web Payments As a Service (WPaaS) for 
banks, financial insitutions, and individuals that want 
to manage their own financial accounts.

A demo of what P3 can do can be found here:

https://dev.payswarm.com/

Quickstart 
----------

You can follow the following tutorial to setup and use 
p3 on a Linux or Mac OS X development machine.

Requirements
------------

* Linux or Mac OS X
* node.js >= 0.10.x
* npm >= 1.4.x
* mongodb ~= 2.4.x

Setup
-----

1. Setup an admin user on mongodb (see below)
2. Map the `payswarm.dev` hostname to your machine (see below).
3. cd <YOUR_SOURCE_DIRECTORY>
3. git clone git@github.com:digitalbazaar/bedrock.git
4. cd bedrock && npm install && cd ..
3. git clone git@github.com:digitalbazaar/p3.git
4. cd p3 && mkdir node_modules
5. ln -s ../../bedrock node_modules/
6. npm install
5. [optional] Tweak config settings in configs/payswarm.dev.js

To setup an admin user on mongodb:

1. mongo
2. use admin
3. db.addUser( { user: "admin", pwd: "password", roles: [ "clusterAdmin", "readWriteAnyDatabase", "userAdminAnyDatabase", "dbAdminAnyDatabase"] } )

To setup the `payswarm.dev` hostname:

1. Edit the /etc/hosts file as the administrator/root.
2. Add an entry mapping the IP address to `payswarm.dev`. 
   For example: `192.168.0.15 payswarm.dev` (where `192.168.0.15` 
   is the IP address of your primary network device.

Running P3
----------

Run the following to start up a development server from the source directory:

    node payswarm.dev.js

To add more verbose debugging, use the `--log-level` option:

    node payswarm.dev.js --log-level debug

To access the server:

1. Go to: https://payswarm.dev:22443/
2. The certificate warning is normal for development mode. Accept it and 
   continue to the landing page. 
3. Login as the admin `admin` with the password `password` or create a new account.

Running the Tests
-----------------

Install protractor (before first test run):

    npm run install-protractor

Run all backend and frontend tests:

    npm run test

Run just the backend tests:

    npm run test-backend

Run just the frontend tests:

    npm run test-frontend

Run a specific frontend test suite:

    nodejs test.js --frontend --suite unit

Running the Code Coverage Tool
------------------------------

    npm run coverage

Look at 'coverage.html' using a web browser

Minimizing the RequireJS client-side JS
---------------------------------------

    npm run minify

To test in dev mode, set the website config var 'minify' to true.

Generating a new self-signed SSL certificate for testing
--------------------------------------------------------

    nodejs create-credentials.js

Save the generated private key and certificate PEMs in the appropriate files
(in ./pki/ if using the default config).

Features
--------

For a complete list of features included in p3, see the [FEATURES][] file.

FAQ
---

See the [FAQ][] file for answers to frequently asked questions.

Hacking
-------

See the [HACKING][] file for various details for coders about
hacking on this project.

Authors
-------

See the [AUTHORS][] file for author contact information.

License
-------

P3 and all p3 modules are:

    Copyright (c) 2010-2015 Digital Bazaar, Inc.
    All Rights Reserved

You can use P3 for non-commercial purposes such as self-study, 
research, personal projects, or for evaluation purposes. See 
the [LICENSE][] file for details about the included 
non-commercial license information.

[AUTHORS]: AUTHORS.md
[FEATURES]: FEATURES.md
[HACKING]: HACKING.md
[FAQ]: FAQ.md
[LICENSE]: LICENSE.md
