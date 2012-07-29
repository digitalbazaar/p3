/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var fs = require('fs');
var path = require('path');
var jsonschema = require('json-schema');
var payswarm = {
  config: require('../payswarm.config'),
  logger: require('./payswarm.loggers').get('app'),
  tools: require('./payswarm.tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var ERROR_TYPE = 'payswarm.docs';
var api = {};
module.exports = api;

// The documentation directory index (used for the top-level docs page)
var docIndex = {};

// Contains a map for validators to method/IRIs
var docToMethodIriMap = {};

// whether or not all of the documentation has been merged
var docsMerged = false;

// The annotation module
var annotate = {};

/**
 * Builds the documentation index for each language supported by the system
 * by entering each language directory in the site content and searching
 * for a site/LANGUAGE/views/docs directory.
 *
 * @param callback called when the documentation indexing has started.
 */
api.buildDocumentationIndex = function(callback) {
  var contentPaths = payswarm.config.website.content;
  var paths = {};
  var locales = payswarm.config.website.locales;
  if(!Array.isArray(contentPaths)) {
    contentPaths = [contentPaths];
  }
  if(!Array.isArray(locales)) {
    locales = [locales];
  }

  // build all top-level language entries
  for(var l in locales) {
    var lang = locales[l];

    paths[lang] = [];
    docIndex[lang] = {};
  }

  // search for documentation files in all content directories
  for(var i in contentPaths) {
    for(var l in locales) {
      var docPath =
        path.resolve(contentPaths[i] + '/' + locales[l] + '/views/docs');
      try {
        var stats = fs.statSync(docPath);
        if(stats) {
          paths[locales[l]].push(docPath);
        }
      } catch(ex) {
        // ignore exceptions for directories that don't exist
      }
    }
  }

  // build the documentation index for all languages
  for(var l in paths) {
    for(var p in paths[l]) {
      var lang = l;
      var docPath = paths[lang][p];
      fs.readdir(docPath, function(err, files) {
        if(err) {
          payswarm.logger.error(
            'Failed to read documentation directory: ' + docPath,
            err.toString());
          return;
        }

        // index all files that end in .tpl that are not index.tpl
        for(var f in files) {
          var filename = files[f];
          if(/\.tpl$/.test(filename) && filename !== 'index.tpl') {
            var rfilename = path.resolve(docPath + '/' + filename);
            _addDocsToIndex(lang, rfilename);
          }
        }
      });
    }
  }

  /* There is a chance that all of the documentation indexes won't be built
   * by the time the server comes up. This is fine. The alternative is to
   * pause start-up until all documentation is indexed. In the worst case,
   * a developer would hit the /docs while the system is coming online
   * and see only partial documentation. A refresh of the page would show
   * all of the documentation.
   */
  callback();
};

/**
 * Retrieve all of the annotations for the system.
 *
 * @returns a map of maps where the first map is keyed by HTTP verbs and the
 *   second-level map is keyed by HTTP URL paths from the root of the server.
 *   Each entry contains an annotations object.
 */
api.getAnnotations = function() {
  return docs;
};

/**
 * Get all categories for a particular language.
 *
 * @param lang the language.
 */
api.getCategories = function(lang) {
  var categories = [];
  for(var category in docIndex[lang]) {
    categories.push(category);
  }
  return categories;
};

/**
 * Get the documentation index for a particular language.
 *
 * @param lang the language.
 */
api.getDocIndex = function(lang) {
  // FIXME: doc info may be merged before all docs read off of disk
  // merge the documentation registration info w/ the doc info from disk
  if(!docsMerged) {
    for(var language in docIndex) {
      for(var category in docIndex[language]) {
        for(var docFile in docIndex[language][category]) {
          if(docFile in docToMethodIriMap) {
            docIndex[language][category][docFile]['method'] =
              docToMethodIriMap[docFile].method;
            docIndex[language][category][docFile]['path'] =
              docToMethodIriMap[docFile].path;
          }
        }
      }
    }
    docsMerged = true;
  }

  return docIndex[lang];
};

/**
 * Retrieves the details associated with a particular documentation file.
 *
 * @param lang the language.
 * @param docFile the name of the file, excluding the .tpl extension.
 */
api.getDetails = function(lang, docFile) {
  return docToMethodIriMap[docFile];
};

/**
 * Documents a particular method and path of the system.
 *
 * @param method the HTTP method name.
 * @param path the HTTP path from the root of the server. The path may include
 *   named variables like /i/:identity.
 * @param docFile the name of the associated document file in the
 *   views/docs/ directory.
 */
api.document = function(method, path, docFile) {
  docToMethodIriMap[docFile] = {
    method: method,
    path: path
  };
};

// short-hand aliases for the documentation methods
annotate.get = function(path, docFile) {
  api.document('get', path, docFile);
};

annotate.post = function(path, docFile) {
  api.document('post', path, docFile);
};

annotate.put = function(path, docFile) {
  api.document('put', path, docFile);
};

annotate.del = function(path, docFile) {
  api.document('delete', path, docFile);
};

api.annotate = annotate;

/**
 * Adds a documentation index entry for the specified language and filename.
 *
 * @param lang the language associated with the filename.
 * @param filename the filename to scan for index information.
 */
function _addDocsToIndex(lang, filename) {
  fs.readFile(filename, 'utf-8', function(err, data) {
    if(err) {
      payswarm.logger.error(
        'Failed to index documentation file: ' + filename,
        err.toString());
      return;
    }

    // search the file for information that should go into the index
    var shortName = path.basename(filename, '.tpl');
    var category = data.match(/\s*category\s*=\s*"(.*)",\s*/);
    var description = data.match(/\s*shortDescription\s*=\s*"(.*)",\s*/);
    category = category ? category[1] : 'Unknown';
    description = description ? description[1] : 'UNDOCUMENTED';

    // add the category and description to the index
    if(!(category in docIndex[lang])) {
      docIndex[lang][category] = {};
    }
    docIndex[lang][category][shortName] = {
      category: category,
      shortDescription: description
    };
  });
};