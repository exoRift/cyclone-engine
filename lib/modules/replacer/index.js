/**
 * Class representing a replacer.
 */
class Replacer {
  /**
   * Create a replacer.
   * @class
   * @param {Object}                                             data                   The data to make a replacer with.
   * @prop  {String}                                             data.key               The key that invokes the replacer.
   * @prop  {String}                                             data.desc              The description of the replacer.
   * @prop  {Object}                                             [data.options={}]      The options for the replacer.
   * @prop  {Argument[]}                                         [data.options.args=[]] The arguments for the replacer.
   * @prop  {function(content: String, capture: String): String} data.action            Function returning the string to replace with.
   */
  constructor ({ key, desc, options = {}, action }) {
    const {
      args = []
    } = options

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
     * The arguments for the replacer.
     * @type {Object[]}
     */
    this.args = args

    /**
     * Function returning the string to replace with.
     * @type {function(content: String, capture: String): String}
     */
    this.action = action
  }

  get info () {
    const args = this.args.reduce((accum, arg, index) => {
      const lastArg = index === this.args.length - 1

      const content = (index ? accum : ' ') + (arg.mand ? '<' : '(') + `${arg.type === 'number' ? '#' : ''}${arg.name}` + (arg.mand ? '>' : ')') + (lastArg ? '' : arg.delim || ' ')
      return content
    }, '')

    return `**${this.key}${args}** - *${this.desc}*`
  }
}

module.exports = Replacer

/**
 * Arguments that go into a command.
 * @typedef {Object}  Argument
 * @prop    {String}  Argument.name            The name of the argument.
 * @prop    {Boolean} [Argument.mand=false]    Whether the argument is mandatory for the command to work or not.
 * @prop    {String}  [Argument.delim=' ']     The delimiter (The character that separates it from the argument after it) for the argument.
 * @prop    {String}  [Argument.type='string'] The type of argument. ('string', 'number')
 */
