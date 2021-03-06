"use strict";

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var fs = require("fs");
var kuromojin = require("kuromojin");
var createMatcher = require("morpheme-match-all");
var yaml = require("js-yaml");

var path = require("path");
var untildify = require("untildify");

var defaultOptions = {
  rulePath: __dirname + "/../dict/fukushi.yml"
};

var data = yaml.safeLoad(fs.readFileSync(__dirname + "/../dict/fukushi.yml", "utf8"));

function loadDictionaries(rulePath, baseDir) {
  if (typeof rulePath === "undefined" || rulePath === "") {
    return null;
  }
  var expandedRulePath = untildify(rulePath);
  var dictionaries = [];

  data.dict.forEach(function (item) {
    var form = "";
    item.tokens.forEach(function (token) {
      form += token.surface_form;
    });
    dictionaries.push({
      message: data.message + ": \"" + form + "\" => \"" + item.expected + "\"",
      fix: item.expected,
      tokens: item.tokens
    });
  });

  return dictionaries;
}

function reporter(context) {
  var userOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var options = Object.assign(defaultOptions, userOptions);
  var matchAll = createMatcher(loadDictionaries(options.rulePath, getConfigBaseDir(context)));
  var Syntax = context.Syntax,
      RuleError = context.RuleError,
      report = context.report,
      getSource = context.getSource,
      fixer = context.fixer;

  return _defineProperty({}, Syntax.Str, function (node) {
    // "Str" node
    var text = getSource(node); // Get text
    return kuromojin.tokenize(text).then(function (actualTokens) {
      var results = matchAll(actualTokens);

      if (results.length == 0) {
        return;
      }

      results.forEach(function (result) {
        var tokenIndex = result.index;
        var index = getIndexFromTokens(tokenIndex, actualTokens);
        var replaceFrom = "";
        result.tokens.forEach(function (token) {
          replaceFrom += token.surface_form;
        });
        var replaceTo = fixer.replaceTextRange([index, index + replaceFrom.length], result.dict.fix);
        var ruleError = new RuleError(result.dict.message, {
          index: index,
          fix: replaceTo // https://github.com/textlint/textlint/blob/master/docs/rule-fixable.md
        });
        report(node, ruleError);
      });
    });
  });
}

function getIndexFromTokens(tokenIndex, actualTokens) {
  var index = 0;
  for (var i = 0; i < tokenIndex; i++) {
    index += actualTokens[i].surface_form.length;
  }
  return index;
}

// from https://github.com/textlint-rule/textlint-rule-prh/blob/master/src/textlint-rule-prh.js#L147
var getConfigBaseDir = function getConfigBaseDir(context) {
  if (typeof context.getConfigBaseDir === "function") {
    return context.getConfigBaseDir() || process.cwd();
  }
  var textlintRcFilePath = context.config ? context.config.configFile : null;
  return textlintRcFilePath ? path.dirname(textlintRcFilePath) : process.cwd();
};

module.exports = {
  linter: reporter,
  fixer: reporter
};
//# sourceMappingURL=index.js.map