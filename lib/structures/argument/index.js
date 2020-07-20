/**
 * Argument data that goes into commands
 */
class Argument {
  /**
   * Construct an Argument
   * @class
   * @param {ArgData|String} data The data for the argument or just the name
   */
  constructor (data) {
    const {
      name,
      mand = false,
      delim = ' ',
      type = 'string'
    } = typeof data === 'string' ? { name: data } : data

    /**
     * The name of the argument
     * @type {String}
     */
    this.name = name

    /**
     * Whether the argument is mandatory or not
     * @type {Boolean}
     */
    this.mand = mand

    /**
     * The delimiter that separates this argument from the next one
     * @type {String}
     */
    this.delim = delim

    /**
     * The type of argument (Used for parsing)
     * @type {String}
     */
    this.type = type
  }
}

module.exports = Argument
