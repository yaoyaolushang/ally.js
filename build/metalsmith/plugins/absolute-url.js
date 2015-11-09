
/* eslint-disable new-cap */

/*
  This is necessary to allow easy URL creation in templates, while
  maintaining the deployment flexibility of relative URLs, as well
  as allowing metalsmith-broken-link-checker to work properly.

  USAGE:

    provide metalsmith.data.root.websiteRoot for use in templates
    absoluteUrl({ property: "websiteRoot", define: "/hello/world" })

    convert all URLs beginning with websiteRoot to relative URLs
    absoluteUrl({ resolve: "/hello/world" })
*/

// inspired by
// https://github.com/davidxmoody/metalsmith-broken-link-checker/blob/master/src/index.coffee

var path = require('path');
var cheerio = require('cheerio');
var URI = require('urijs');

var urlSelector = Object.keys(URI.domAttributes).map(function(tagName) {
  return tagName + '[' + URI.domAttributes[tagName] + ']';
}).join(',');

function filter(file, files, filePath /*, options*/) {
  // skip mutations for anything that isn't html
  if (filePath.ext !== '.html') {
    return true;
  }

  return false;
}

function transform($, file, fileName, options) {
  var absolute = path.join(options.resolve, fileName);
  // URI('/medialize/ally.js/api/style/focus-within.html').relativeTo('/medialize/ally.js/contributing/index.html').toString()
  // "../api/style/focus-within.html"
  $(urlSelector).each(function() {
    var $element = $(this);
    $element.nodeName = $element[0].name;
    var attribute = URI.getDomAttribute($element);
    if (!attribute) {
      // element does not have a URL attribute
      return;
    }

    var url = $element.attr(attribute);
    if (url.slice(0, options.resolve.length) !== options.resolve) {
      // URL is not using the absolute prefix
      return;
    }

    var resolved = URI(url).relativeTo(absolute).toString();
    if (!resolved) {
      // the file is linking to itself
      resolved = URI(fileName).filename();
    }

    if (resolved[resolved.length - 1] === '/') {
      // the file is linking to a directory, append index.html
      resolved += 'index.html';
    }

    $element.attr(attribute, resolved);
  });
}

module.exports = function plugin(options) {
  if (!options) {
    options = {};
  }

  if (options.define) {
    return function(files, metalsmith, done) {
      var metadata = metalsmith.metadata();
      metadata[options.property || 'websiteRoot'] = options.define;
      done();
    };
  }

  return function(files, metalsmith, done) {
    Object.keys(files).forEach(function(key) {
      var filePath = path.parse(key);
      if (filter(key, files, filePath, options)) {
        return;
      }

      var page = cheerio.load(files[key].contents);
      transform(page, files[key], key, options);
      files[key].contents = new Buffer(page.html());
    });

    done();
  };
};