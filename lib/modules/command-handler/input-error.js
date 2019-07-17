/**
 * Class representing an input error.
 */
class InputError extends Error {
  /**
   * Construct an input error.
   * @param {String} name    The name of the error.
   * @param {String} message The error message.
   * @param {String} type    The type of error.
   */
  constructor (name, message, type) {
    super(message)

    /**
     * The type of error.
     * @type {String}
     */
    this.type = type

    /**
     * The name of the error.
     * @type {String}
     */
    this.name = name
  }
}

module.exports = InputError
