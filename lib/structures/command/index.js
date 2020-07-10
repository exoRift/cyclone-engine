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
   * @prop  {Object}          [data.options.guide={}]         Guide info displayed when a command guide is built with the agent
   * @prop  {Number}          [data.options.guide.color=0]    An integer color for the sidebar of the command guide
   * @prop  {Object[]}        [data.options.guide.fields=[]]  A list of field objects displayed in the guide
   * @prop  {Boolean}         [data.options.restricted=false] Whether or not this command is restricted to admin only
   * @prop  {Boolean}         [data.options.guildOnly=false]  Whether or not this command can only be triggered in guilds as opposed to DMs
   * @prop  {Number}          [data.options.authLevel=0]      The minimum auth level required to execute this command
   * @prop  {CommandAction}   data.action                     The command action
   */
  constructor ({ name, desc, options = {}, action }) {
    const {
      args = [],
      aliases = [],
      guide = {},
      restricted = false,
      guildOnly = false,
      authLevel
    } = options

    const {
      color = 0,
      fields = []
    } = guide

    for (const arg of args) {
      arg.delim = arg.delim || ' '
      arg.mand = arg.mand || false
      arg.type = arg.type || 'string'
    }

    /**
     * Argument type prefixes for command info
     * @private
     * @type    {Object}
     * @prop    {String} number
     * @prop    {String} user
     * @prop    {String} channel
     */
    this._typePrefixes = {
      number: '#',
      user: '@',
      channel: '[#]'
    }

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
     * @prop {Argument[]} args         The arguments for the command
     * @prop {String[]}   aliases      Other names that trigger the command
     * @prop {Object}     guide        Guide info displayed when a command guide is built with the agent
     * @prop {Number}     guide.color  An integer color for the sidebar of the command guide
     * @prop {Object[]}   guide.fields A list of field objects displayed in the guide
     * @prop {Boolean}    restricted   Whether or not this command is restricted to admin only
     * @prop {Boolean}    guildOnly    Whether or not this command can only be triggered in guilds as opposed to DMs
     * @prop {Number}     authLevel    The minimum auth level required to execute this command
     */
    this.options = {
      args,
      aliases: (Array.isArray(aliases) ? aliases : [aliases]).map((a) => a.toLowerCase()),
      guide: {
        color,
        fields
      },
      restricted,
      guildOnly,
      authLevel: parseInt(authLevel) || 0
    }

    /**
     * The command action
     * @type {CommandAction}
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

      const content = (index ? accum : '') + (arg.mand ? '<' : '(') + `${this._typePrefixes[arg.type] || ''}${arg.name}` + (arg.mand ? '>' : ')') + (lastArg ? '' : arg.delim)
      return content
    }, '')

    return `${this.options.restricted ? '~~' : ''}${name}${args ? ` **${args}**` : ''} - *${this.desc}*${this.options.restricted ? '~~' : ''}`
  }
}

module.exports = Command

/**
 * The command action
 * @callback                                                   CommandAction
 * @param    {CommandData}                                     data          Data passed from the handler
 * @returns  {CommandResults[]|CommandResults|String[]|String}               Data to respond with
 */

/**
 * The object passed to a command action
 * @typedef {Object}                                      CommandData
 * @prop    {Agent}                                       CommandData.agent       The agent managing the bot
 * @prop    {Eris.Client}                                 CommandData.client      The Eris client
 * @prop    {Map<String, Command>}                        CommandData.commands    The list of bot commands
 * @prop    {Map<String, Replacer>}                       CommandData.replacers   The list of bot replacers
 * @prop    {Eris.Message}                                CommandData.msg         The message sent by the user
 * @prop    {Array<String|Number|Eris.Channel|Eris.User>} CommandData.args        The arguments supplied by the user
 * @prop    {Object}                                      CommandData.attachments User-supplied data that is passed to commands
 */
