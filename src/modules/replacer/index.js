/**
 * Class representing a replacer.
 */
class Replacer {
  /**
   * Create a replacer.
   * @param {ReplacerData} data The data to make a replacer with.
   */
  constructor ({ key, desc, start = false, action }) {
    /**
     * The key or ID.
     * @type {String}
     */
    this.key = key
    /**
     * The description of the replacer.
     * @type {String}
     */
    this.desc = desc
    /**
     * It's something.
     * @type {Boolean}
     */
    this.start = start
    /**
     * Function returning the string to replace with. (param is an object containing: content, capture)
     * @type {Function}
     */
    this.action = action
  }
}

module.exports = Replacer

/**
 * Fancy keyword replacer data.
 * @typedef  {Object}   ReplacerData
 * @property {String}   key           The keyword to replace.
 * @property {String}   desc          A description of what it does.
 * @property {Boolean}  [start=false] Dunno what this is.
 * @property {Function} action        Function returning the string to replace with. (param is an object containing: content, capture)
 */
