/**
 * Class representing a replacer.
 */
class Replacer {
  /**
   * Create a replacer.
   * @param    {Object}   data        The data to make a replacer with.
   * @property {String}   data.key    The key that invokes the replacer.
   * @property {String}   data.desc   The description of the replacer.
   * @property {Function} data.action Function returning the string to replace with. (Param is an object containing: content, capture)
   */
  constructor ({ key, desc, start = false, action }) {
    /**
     * The data to make a replacer with.
     * @type {String}
     */
    this.key = key
    /**
     * The description of the replacer.
     * @type {String}
     */
    this.desc = desc
    /**
     * Set whether the replacer requires parameters.
     * @type {Boolean}
     */
    this.start = start
    /**
     * Function returning the string to replace with. (Param is an object containing: content, capture)
     * @type {Function}
     */
    this.action = action
  }
}

module.exports = Replacer
