/**
 * A class representing an await for a message.
 */
class Await {
  /**
   * Create an Await.
   * @param    {Object}   data                          The await data.
   * @property {Object}   data.options                  The options for the await
   * @property {Number}   [data.options.timeout=15000]  How long until the await cancels.
   * @property {Boolean}  [data.options.oneTime=false]  Whether a non-triggering message cancels the await.
   * @property {Function} [data.options.check=()=>true] The condition to be met for the await to trigger. (Params are the bot's prefix and the message)
   * @property {Function} data.action                   The await action.
   */
  constructor (data) {
    const {
      options = {}
    } = data
    const {
      timeout = 15000,
      oneTime,
      check = () => true
    } = options
    /**
     * How long until the await cancels.
     * @type {Number}
     */
    this.timeout = timeout
    /**
     * Whether a non-triggering message cancels the await.
     * @type {Boolean}
     */
    this.oneTime = oneTime
    /**
     * The condition to be met for the await to trigger. (Params are the bot's prefix and the message)
     * @type {Function}
     */
    this.check = check
  }
}

module.exports = Await
