const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const debug = require('debug')('indiekit:support:utils');
const {DateTime} = require('luxon');
const nunjucks = require('nunjucks');
const markdown = require('./lib/markdown');

const utils = {
  /**
   * Add data to an array, creating it if doesn’t exist.
   *
   * @function addToArray
   * @param {Array} arr Array
   * @param {Object} data Data to add
   * @return {Array} Updated array
   */
  addToArray(arr, data) {
    if (!arr) {
      arr = [];
    }

    arr.push(data);

    return arr;
  },

  /**
   * Remove falsey values if provided object is an array.
   *
   * @function cleanArray
   * @param {Object} obj Object containing array to be cleaned
   * @return {Array|Object} Cleaned array, else original object
   */
  cleanArray(obj) {
    return _.isArray(obj) ? _.compact(obj) : obj;
  },

  /**
   * Recursively remove empty, null and falsy values from an object.
   * Adapted from Ori Drori’s answer on Stack Overflow
   * https://stackoverflow.com/a/54186837
   *
   * @function cleanObject
   * @param {Object} obj Object to clean
   * @return {Object} Cleaned object
   */
  cleanObject(obj) {
    return _.transform(obj, (prop, value, key) => {
      const isObject = _.isObject(value);
      const val = isObject ? utils.cleanArray(utils.cleanObject(value)) : value;
      const keep = isObject ? !_.isEmpty(val) : Boolean(val);

      if (keep) {
        prop[key] = val;
      }
    });
  },

  /**
   * Decode form-encoded string.
   *
   * @function decodeFormEncodedString
   * @example decodeFormEncodedString('foo+bar') => 'foo bar'
   * @example decodeFormEncodedString('http%3A%2F%2Ffoo.bar') => 'http://foo.bar'
   * @param {String} str String to decode
   * @return {String} Decoded string
   */
  decodeFormEncodedString(str) {
    if (typeof str === 'string') {
      str = str.replace(/\+/g, '%20');
      return decodeURIComponent(str);
    }

    return false;
  },

  /**
   * Format date
   *
   * @function formatDate
   * @param {String} str ISO 8601 date
   * @param {String} format Tokenised date format
   * @param {String} locale Locale
   * @return {String} Formatted date
   */
  formatDate(str, format, locale = 'en-GB') {
    const date = (str === 'now') ? DateTime.local() : str;

    const datetime = DateTime.fromISO(date, {
      locale,
      zone: 'utc'
    }).toFormat(format);

    return datetime;
  },

  /**
   * Get file from publisher and save it to filesystem.
   *
   * @exports getData
   * @param {Object} basepath Path to remote file
   * @param {Object} tmpdir Temporary directory
   * @param {Function} publisher Publishing function
   * @returns {String|Object} Cache value
   */
  async getData(basepath, tmpdir, publisher) {
    let data;
    const filePath = path.join(tmpdir, basepath);
    const fileData = await fs.promises.readFile(filePath, {encoding: 'utf-8'})
      .catch(error => {
        debug('Error fetching %O from filesystem', error);
      });

    if (fileData) {
      debug('Got %s from filesystem', basepath);
      data = fileData;
    } else {
      const pubData = await publisher.readFile(basepath)
        .catch(error => {
          throw new Error(error.message);
        });

      if (pubData) {
        await fs.promises.mkdir(path.dirname(filePath), {recursive: true}).catch(error => {
          throw new Error(error.message);
        });

        await fs.promises.writeFile(filePath, pubData).catch(error => {
          throw new Error(error.message);
        });

        debug('Got %s from publisher', basepath);
        data = pubData;
      }
    }

    return data;
  },

  /**
   * Render a Nunjucks template string using context data.
   *
   * @function render
   * @param {String} string Template string
   * @param {String} context Context data
   * @return {String} Rendered string
   */
  render(string, context) {
    const env = new nunjucks.Environment();

    env.addFilter('date', this.formatDate);

    return env.renderString(string, context);
  },

  /**
   * Render Markdown string as HTML
   *
   * @function renderMarkdown
   * @param {String} str Markdown
   * @param {String} value If 'inline', HTML rendered without paragraph tags
   * @return {String} HTML
   *
   */
  renderMarkdown(str, value) {
    if (str) {
      if (value === 'inline') {
        return markdown.renderInline(str);
      }

      return markdown.render(str);
    }
  }
};

module.exports = utils;
