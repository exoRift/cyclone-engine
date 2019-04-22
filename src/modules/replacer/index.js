/**
 * Class representing a replacer.
 */
class Replacer {
  /**
   * Create a replacer.
   * @param    {Object}   data                   The data to make a replacer with.
   * @property {String}   data.key               The key that invokes the replacer.
   * @property {String}   data.desc              The description of the replacer.
   * @property {Object}   [data.options={}]      The options for the replacer.
   * @property {Object[]} [data.options.args=[]] The arguments for the replacer.
   * @property {Function} data.action            Function returning the string to replace with. (Param is an object containing: content, capture)
   */
  constructor ({ key, desc, options = {}, action }) {
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
    const {
      args = []
    } = options
    /**
     * The arguments for the replacer.
     * @type {Object[]}
     */
    this.args = args
    /**
     * Function returning the string to replace with. (Param is an object containing: content, capture, args)
     * @type {Function}
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
