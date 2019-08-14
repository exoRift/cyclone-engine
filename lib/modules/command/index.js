/**
 * Class representing a command.
 */
class Command {
  /**
   * Create a command.
   * @class
   * @param {Object}          data                            The command data.
   * @prop  {String}          data.name                       The command name.
   * @prop  {String}          data.desc                       The command description.
   * @prop  {Object}          [data.options={}]               The command options.
   * @prop  {Argument[]}      [data.options.args=[]]          The arguments for the command.
   * @prop  {String[]|String} [data.options.aliases=[]]       Other names that trigger the command.
   * @prop  {String}          data.options.dbTable            The name of database table to fetch user data from (primary key must be named `id`).
   * @prop  {Boolean}         [data.options.restricted=false] Whether or not this command is restricted to admin only.
   * @prop  {commandAction}   data.action                     The command action.
   */
  constructor ({ name, desc, options = {}, action }) {
    const {
      args = [],
      aliases = [],
      dbTable,
      restricted = false
    } = options

    for (const arg of args) {
      if (arg.delim && arg.delim.length > 1) console.error(`WARNING: Delimiters that are longer than 1 character will not work:\n${arg.name}:`, arg.delim)
    }

    /**
     * The command name.
     * @type {String}
     */
    this.name = name.toLowerCase()

    /**
     * The command description.
     * @type {String}
     */
    this.desc = desc

    /**
     * The arguments for the command.
     * @type {Arg[]}
     */
    this.args = args

    /**
     * Other names that trigger the command.
     * @type {String[]}
     */
    this.aliases = (aliases instanceof Array ? aliases : [aliases]).map((a) => a.toLowerCase())

    /**
     * Name of database table to fetch, data is passed through to action with the same name.
     * @type {String}
     */
    this.dbTable = dbTable

    /**
     * Whether or not this command is restricted to admin only.
     * @type {Boolean}
     */
    this.restricted = restricted

    /**
     * The command action.
     * @type {commandAction}
     */
    this.action = action
  }

  /**
   * Get the info of this command.
   * @type {String} A string describing the command. (**name <mandatory arg> (optional arg) (#number arg)** - *description*)
   */
  get info () {
    const args = this.args.reduce((accum, arg, index) => {
      const lastArg = index === this.args.length - 1

      const content = (index ? accum : ' ') + (arg.mand ? '<' : '(') + `${arg.type === 'number' ? '#' : ''}${arg.name}` + (arg.mand ? '>' : ')') + (lastArg ? '' : arg.delim || ' ')
      return content
    }, '')

    return `${this.restricted ? '~~' : ''}**${this.name}${args}** - *${this.desc}*${this.restricted ? '~~' : ''}`
  }
}

module.exports = Command

/**
 * The command action.
 * @callback                                                   commandAction
 * @param    {CommandData}                                     data          Data passed from the handler.
 * @returns  {CommandResults[]|CommandResults|String[]|String}               Data to respond with.
 */

/**
 * The object passed to a command action.
 * @typedef {Object}                CommandData
 * @prop    {Agent}                 CommandData.agent     The agent managing the bot.
 * @prop    {Eris.Client}           CommandData.client    The Eris client.
 * @prop    {Map<String, Command>}  CommandData.commands  The list of bot commands.
 * @prop    {Map<String, Replacer>} CommandData.replacers The list of bot replacers.
 * @prop    {Eris.Message}          CommandData.msg       The message sent by the user.
 * @prop    {String[]}              CommandData.args      The arguments supplied by the user.
 * @prop    {Object}                CommandData.userData  The table data fetched where `id` is the user's ID (Requested with dbData).
 * @prop    {QueryBuilder}          CommandData.knex      The simple-knex query builder used by the command handler.
 */
