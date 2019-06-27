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
    return `**${this.key}` + this.args.reduce((a, e, i) => {
      const content = a + (e.mand ? `<${e.name}>` : `(${e.name})`) + (e.delim || ' ')
      return (i === this.args.length - 1) ? content.slice(0, -1 * (e.delim ? e.delim.length : 1)) : content
    }, ' ') + `** - *${this.desc}*`
  }
}

module.exports = Replacer
