/**
 * Class representing an input error.
 */
class InputError extends Error {
  /**
   * Construct an input error.
   * @param {String} name    The name of the error.
   * @param {String} message The error message.
   * @param {String} code    The code of error.
   */
  constructor (name, message, code) {
    super(message)

    /**
     * The type of error.
     * @type {String}
     */
    this.code = code

    /**
     * The name of the error.
     * @type {String}
     */
    this.name = name
  }
}

module.exports = InputError
