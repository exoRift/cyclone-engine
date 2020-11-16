/**
 * Argument data that goes into commands
 */
class Argument {
  /**
   * Construct an Argument
   * @class
   * @param   {Object|String} data                 The data for the argument or just the name
   * @prop    {String}        data.name            The name of the argument
   * @prop    {Boolean}       [data.mand=false]    Whether the argument is mandatory for the command to work or not
   * @prop    {String}        [data.delim=' ']     The delimiter (The character(s) that separate(s) it from the argument after it) for the argument
   * @prop    {String}        [data.type='string'] The type of argument
   * @example                                      Types: `string`  - A regular string
   *                                                      `number`  - A number is parsed from the supplied argument
   *                                                      `user`    - From a username or mention, the Eris.User instance is supplied to the action
   *                                                      `channel` - From a name or mention, the Eris.Channel instance is supplied to the action
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
