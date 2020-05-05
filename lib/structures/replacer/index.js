/**
 * A class used to register keywords in a message that are replaced with live data.
 */
class Replacer {
  /**
   * Create a replacer.
   * @class
   * @param {Object}         data                   The data to make a replacer with.
   * @prop  {String}         data.key               The key that invokes the replacer.
   * @prop  {String}         data.desc              The description of the replacer.
   * @prop  {Object}         [data.options={}]      The options for the replacer.
   * @prop  {Argument[]}     [data.options.args=[]] The arguments for the replacer.
   * @prop  {replacerAction} data.action            A function returning the string to replace with.
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
     * The options for the replacer.
     * @type {Object}
     * @prop {Argument[]} args The arguments for the replacer.
     */
    this.options = {
      args
    }

    /**
     * Function returning the string to replace with.
     * @type {replacerAction}
     */
    this.action = action
  }

  /**
   * Get the info of this replacer. as a string
   * @type    {String}
   * @example          '**name <mandatory arg> (optional arg) (#number arg)** - *description*'
   */
  get info () {
    const args = this.options.args.reduce((accum, arg, index) => {
      const lastArg = index === this.options.args.length - 1

      const content = (index ? accum : ' ') + (arg.mand ? '<' : '(') + `${arg.type === 'number' ? '#' : ''}${arg.name}` + (arg.mand ? '>' : ')') + (lastArg ? '' : arg.delim || ' ')
      return content
    }, '')

    return `**${this.key}${args}** - *${this.desc}*`
  }
}

module.exports = Replacer

/**
 * The replacer action.
 * @callback                 replacerAction
 * @param   {Object}         data           The data passed to the replacer.
 * @prop    {String}         data.content   The content of the message.
 * @prop    {String}         data.capture   What was captured in the replacer braces.
 * @prop    {String[]}       data.args      The arguments provided for the replacer.
 * @returns {String}                        The content to inject.
 */
