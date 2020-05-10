/**
 * Class representing a command
 */
class Command {
  /**
   * Create a command
   * @class
   * @param {Object}          data                            The command data
   * @prop  {String}          data.name                       The command name
   * @prop  {String}          data.desc                       The command description
   * @prop  {Object}          [data.options={}]               The command options
   * @prop  {Argument[]}      [data.options.args=[]]          The arguments for the command
   * @prop  {String[]|String} [data.options.aliases=[]]       Other names that trigger the command
   * @prop  {Boolean}         [data.options.restricted=false] Whether or not this command is restricted to admin only
   * @prop  {commandAction}   data.action                     The command action
   */
  constructor ({ name, desc, options = {}, action }) {
    const {
      args = [],
      aliases = [],
      restricted = false
    } = options

    /**
     * The command name
     * @type {String}
     */
    this.name = name.toLowerCase()

    /**
     * The command description
     * @type {String}
     */
    this.desc = desc

    /**
     * The options for the command
     * @type {Object}
     * @prop {Argument[]} args       The arguments for the command
     * @prop {String[]}   aliases    Other names that trigger the command
     * @prop {Boolean}    restricted Whether or not this command is restricted to admin only
     */
    this.options = {
      args,
      aliases: (Array.isArray(aliases) ? aliases : [aliases]).map((a) => a.toLowerCase()),
      restricted
    }

    /**
     * The command action
     * @type {commandAction}
     */
    this.action = action
  }

  /**
   * Get the info of this command
   * @type    {String}
   * @example          '**name**|**alias** **<mandatory arg> (optional arg) (#number arg)** - *description*'
   */
  get info () {
    const name = `**${this.name}**` + this.options.aliases.reduce((accum, alias) => `${accum}|**${alias}**`, '')

    const args = this.options.args.reduce((accum, arg, index) => {
      const lastArg = index === this.options.args.length - 1

      const content = (index ? accum : '') + (arg.mand ? '<' : '(') + `${arg.type === 'number' ? '#' : ''}${arg.name}` + (arg.mand ? '>' : ')') + (lastArg ? '' : arg.delim || ' ')
      return content
    }, '')

    return `${this.options.restricted ? '~~' : ''}${name}${args ? ` **${args}**` : ''} - *${this.desc}*${this.options.restricted ? '~~' : ''}`
  }
}

module.exports = Command

/**
 * The command action
 * @callback                                                   commandAction
 * @param    {CommandData}                                     data          Data passed from the handler
 * @returns  {CommandResults[]|CommandResults|String[]|String}               Data to respond with
 */

/**
 * The object passed to a command action
 * @typedef {Object}                CommandData
 * @prop    {Agent}                 CommandData.agent     The agent managing the bot
 * @prop    {Eris.Client}           CommandData.client    The Eris client
 * @prop    {Map<String, Command>}  CommandData.commands  The list of bot commands
 * @prop    {Map<String, Replacer>} CommandData.replacers The list of bot replacers
 * @prop    {Eris.Message}          CommandData.msg       The message sent by the user
 * @prop    {String[]}              CommandData.args      The arguments supplied by the user
 */
