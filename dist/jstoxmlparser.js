(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports);
    global.jstoxmlparser = mod.exports;
  }
})(this, function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function _toConsumableArray(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
        arr2[i] = arr[i];
      }

      return arr2;
    } else {
      return Array.from(arr);
    }
  }

  var _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  var ARRAY = 'array';
  var BOOLEAN = 'boolean';
  var DATE = 'date';
  var NULL = 'null';
  var NUMBER = 'number';
  var OBJECT = 'object';
  var SPECIAL_OBJECT = 'special-object';
  var STRING = 'string';

  var PRIVATE_VARS = ['_selfCloseTag', '_attrs'];
  var PRIVATE_VARS_REGEXP = new RegExp(PRIVATE_VARS.join('|'), 'g');

  /**
   * Determines the indent string based on current tree depth.
   */
  var getIndentStr = function getIndentStr() {
    var indent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    var depth = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    return indent.repeat(depth);
  };

  /**
   * Sugar function supplementing JS's quirky typeof operator, plus some extra help to detect
   * "special objects" expected by jstoxml.
   * Example:
   * getType(new Date());
   * -> 'date'
   */
  var getType = function getType(val) {
    return Array.isArray(val) && ARRAY || (typeof val === 'undefined' ? 'undefined' : _typeof(val)) === OBJECT && val !== null && val._name && SPECIAL_OBJECT || val instanceof Date && DATE || val === null && NULL || (typeof val === 'undefined' ? 'undefined' : _typeof(val));
  };

  /**
   * Replaces matching values in a string with a new value.
   * Example:
   * filterStr('foo&bar', { '&': '&amp;' });
   * -> 'foo&amp;bar'
   */
  var filterStr = function filterStr() {
    var inputStr = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    var filter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var regexp = new RegExp('(' + Object.keys(filter).join('|') + ')', 'g');

    return String(inputStr).replace(regexp, function (str, entity) {
      return filter[entity] || '';
    });
  };

  /**
   * Maps an object or array of arribute keyval pairs to a string.
   * Examples:
   * { foo: 'bar', baz: 'g' } -> 'foo="bar" baz="g"'
   * [ { ⚡: true }, { foo: 'bar' } ] -> '⚡ foo="bar"'
   */
  var getAttributeKeyVals = function getAttributeKeyVals() {
    var attributes = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var filter = arguments[1];

    var isArray = Array.isArray(attributes);

    var keyVals = [];
    if (isArray) {
      // Array containing complex objects and potentially duplicate attributes.
      keyVals = attributes.map(function (attr) {
        var key = Object.keys(attr)[0];
        var val = attr[key];

        var filteredVal = filter ? filterStr(val, filter) : val;
        var valStr = filteredVal === true ? '' : '="' + filteredVal + '"';
        return '' + key + valStr;
      });
    } else {
      var keys = Object.keys(attributes);
      keyVals = keys.map(function (key) {
        // Simple object - keyval pairs.

        // For boolean true, simply output the key.
        var filteredVal = filter ? filterStr(attributes[key], filter) : attributes[key];
        var valStr = attributes[key] === true ? '' : '="' + filteredVal + '"';

        return '' + key + valStr;
      });
    }

    return keyVals;
  };

  /**
   * Converts an attributes object/array to a string of keyval pairs.
   * Example:
   * formatAttributes({ a: 1, b: 2 })
   * -> 'a="1" b="2"'
   */
  var formatAttributes = function formatAttributes() {
    var attributes = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var filter = arguments[1];

    var keyVals = getAttributeKeyVals(attributes, filter);
    if (keyVals.length === 0) return '';

    var keysValsJoined = keyVals.join(' ');
    return ' ' + keysValsJoined;
  };

  /**
   * Converts an object to a jstoxml array.
   * Example:
   * objToArray({ foo: 'bar', baz: 2 });
   * ->
   * [
   *   {
   *     _name: 'foo',
   *     _content: 'bar'
   *   },
   *   {
   *     _name: 'baz',
   *     _content: 2
   *   }
   * ]
   */
  var objToArray = function objToArray() {
    var obj = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    return Object.keys(obj).map(function (key) {
      return {
        _name: key,
        _content: obj[key]
      };
    });
  };

  /**
   * Determines if a value is a primitive JavaScript value (not including Symbol).
   * Example:
   * isPrimitive(4);
   * -> true
   */
  var PRIMITIVE_TYPES = [STRING, NUMBER, BOOLEAN];
  var isPrimitive = function isPrimitive(val) {
    return PRIMITIVE_TYPES.includes(getType(val));
  };

  /**
   * Determines if a value is a object that is not array. no indent and line break will apply
   * Example:
   * isSimpleObject(new Object());
   * -> true
   */
  var OBJECT_TYPES = [OBJECT];
  var isSimpleObject = function isSimpleObject(val) {
    return OBJECT_TYPES.includes(getType(val)) && !Array.isArray(val);
  };

  /**
   * Determines if a value is a simple primitive type that can fit onto one line.  Needed for
   * determining any needed indenting and line breaks.
   * Example:
   * isSimpleType(new Date());
   * -> true
   */
  var SIMPLE_TYPES = [].concat(PRIMITIVE_TYPES, [DATE, SPECIAL_OBJECT]);
  var isSimpleType = function isSimpleType(val) {
    return SIMPLE_TYPES.includes(getType(val));
  };
  /**
   * Determines if an XML string is a simple primitive, or contains nested data.
   * Example:
   * isSimpleXML('<foo />');
   * -> false
   */
  var isSimpleXML = function isSimpleXML(xmlStr) {
    return !xmlStr.match('<');
  };

  /**
   * Assembles an XML header as defined by the config.
   */
  var DEFAULT_XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
  var getHeaderString = function getHeaderString(_ref) {
    var header = _ref.header,
        indent = _ref.indent,
        depth = _ref.depth,
        isOutputStart = _ref.isOutputStart;

    var shouldOutputHeader = header && isOutputStart;

    if (!shouldOutputHeader) return '';

    var shouldUseDefaultHeader = (typeof header === 'undefined' ? 'undefined' : _typeof(header)) === BOOLEAN;
    return '' + (shouldUseDefaultHeader ? DEFAULT_XML_HEADER : header) + (indent ? '\n' : '');
  };

  /**
   * Recursively traverses an object tree and converts the output to an XML string.
   * Example:
   * toXML({ foo: 'bar' });
   * -> <foo>bar</foo>
   */
  var toXML = exports.toXML = function toXML() {
    var obj = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var _config$depth = config.depth,
        depth = _config$depth === undefined ? 0 : _config$depth,
        indent = config.indent,
        _isFirstItem = config._isFirstItem,
        _isLastItem = config._isLastItem,
        attributesFilter = config.attributesFilter,
        header = config.header,
        filter = config.filter;

    // Determine indent string based on depth.

    var indentStr = getIndentStr(indent, depth);

    // For branching based on value type.
    var valType = getType(obj);
    var isSimple = isSimpleType(obj);

    // Determine if this is the start of the output.  Needed for header and indenting.
    var isOutputStart = depth === 0 && (isSimple || !isSimple && _isFirstItem);

    var outputStr = '';
    switch (valType) {
      case 'special-object':
        {
          // Processes a specially-formatted object used by jstoxml.

          var _name = obj._name,
              _content = obj._content;

          // Output text content without a tag wrapper.

          if (_content === null) {
            outputStr = _name;
            break;
          }

          // Handles arrays of primitive values. (#33)
          if (Array.isArray(_content) && (_content.every(isPrimitive) || _content.every(isSimpleObject))) {
            return _content.map(function (a) {
              return toXML({
                _name: _name,
                _content: a
              }, _extends({}, config, {
                depth: depth
              }));
            }).join('');
          }

          // Don't output private vars (such as _attrs).
          if (_name.match(PRIVATE_VARS_REGEXP)) break;

          // Process the nested new value and create new config.
          var newVal = toXML(_content, _extends({}, config, { depth: depth + 1 }));
          var newValType = getType(newVal);
          var isNewValSimple = isSimpleXML(newVal);

          // Pre-tag output (indent and line breaks).
          var preIndentStr = indent && !isOutputStart ? '\n' : '';
          var preTag = '' + preIndentStr + indentStr;

          // Tag output.
          var valIsEmpty = newValType === 'undefined' || newVal === '';
          var shouldSelfClose = _typeof(obj._selfCloseTag) === BOOLEAN ? valIsEmpty && obj._selfCloseTag : valIsEmpty;
          var selfCloseStr = shouldSelfClose ? '/' : '';
          var attributesString = formatAttributes(obj._attrs, attributesFilter);
          var tag = '<' + _name + attributesString + selfCloseStr + '>';

          // Post-tag output (closing tag, indent, line breaks).
          var preTagCloseStr = indent && !isNewValSimple ? '\n' + indentStr : '';
          var postTag = !shouldSelfClose ? '' + newVal + preTagCloseStr + '</' + _name + '>' : '';

          outputStr = '' + preTag + tag + postTag;
          break;
        }

      case 'object':
        {
          // Iterates over keyval pairs in an object, converting each item to a special-object.

          var keys = Object.keys(obj);
          var outputArr = keys.map(function (key, index) {
            var newConfig = _extends({}, config, {
              _isFirstItem: index === 0,
              _isLastItem: index + 1 === keys.length
            });

            var outputObj = { _name: key };

            if (getType(obj[key]) === 'object') {
              // Sub-object contains an object.

              // Move private vars up as needed.  Needed to support certain types of objects
              // E.g. { foo: { _attrs: { a: 1 } } } -> <foo a="1"/>
              PRIVATE_VARS.forEach(function (privateVar) {
                var val = obj[key][privateVar];
                if (typeof val !== 'undefined') {
                  outputObj[privateVar] = val;
                  delete obj[key][privateVar];
                }
              });

              var hasContent = typeof obj[key]._content !== 'undefined';
              if (hasContent) {
                // _content has sibling keys, so pass as an array (edge case).
                // E.g. { foo: 'bar', _content: { baz: 2 } } -> <foo>bar</foo><baz>2</baz>
                if (Object.keys(obj[key]).length > 1) {
                  var newContentObj = Object.assign({}, obj[key]);
                  delete newContentObj._content;

                  outputObj._content = [].concat(_toConsumableArray(objToArray(newContentObj)), [obj[key]._content]);
                }
              }
            }

            // Fallthrough: just pass the key as the content for the new special-object.
            if (typeof outputObj._content === 'undefined') outputObj._content = obj[key];

            var xml = toXML(outputObj, newConfig, key);

            return xml;
          }, config);

          outputStr = outputArr.join('');
          break;
        }

      case 'function':
        {
          // Executes a user-defined function and return output.

          var fnResult = obj(config);

          outputStr = toXML(fnResult, config);
          break;
        }

      case 'array':
        {
          // Iterates and converts each value in an array.

          var _outputArr = obj.map(function (singleVal, index) {
            var newConfig = _extends({}, config, {
              _isFirstItem: index === 0,
              _isLastItem: index + 1 === obj.length
            });
            return toXML(singleVal, newConfig);
          });

          outputStr = _outputArr.join('');

          break;
        }

      // number, string, boolean, date, null, etc
      default:
        {
          outputStr = filterStr(obj, filter);
          break;
        }
    }

    var headerStr = getHeaderString({ header: header, indent: indent, depth: depth, isOutputStart: isOutputStart });

    return '' + headerStr + outputStr;
  };

  exports.default = {
    toXML: toXML
  };
});
