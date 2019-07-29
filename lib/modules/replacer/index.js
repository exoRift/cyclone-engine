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
   * @prop  {Object[]}                                           [data.options.args=[]] The arguments for the replacer.
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
