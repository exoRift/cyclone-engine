/**
 * An error that occurs when there's an issue designated to be ignored
 */
class IgnoredError extends Error {
  /**
   * Construct an ignored error
   * @param {String}        name    The name of the error
   * @param {String}        message The error message
   * @param {String|Number} code    The code of error
   */
  constructor (name, message, code) {
    super(message)

    /**
     * The name of the error
     * @type {String}
     */
    this.name = name

    /**
     * The type of error
     * @type {String}
     */
    this.code = code
  }
}

module.exports = IgnoredError
