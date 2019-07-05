/**
 * Class representing a command.
 */
class Command {
  /**
   * Create a command.
   * @class
   * @param {Object}                                         data                            The command data.
   * @prop  {String}                                         data.name                       The command name.
   * @prop  {String}                                         data.desc                       The command description.
   * @prop  {Object}                                         [data.options={}]               The command options.
   * @prop  {Object[]}                                       [data.options.args=[]]          List of arguments that the command takes.
   * @prop  {String}                                         [data.options.dbTable='']       Name of database table to fetch user data from (primary key must be named `id`).
   * @prop  {Boolean}                                        [data.options.restricted=false] Whether or not this command is restricted to admin only.
   * @prop  {function(CommandData): (CommandResults|String)} data.action                     The command action.
   */
  constructor ({ name, desc, options = {}, action }) {
    const {
      args = [],
      dbTable = '',
      restricted = false
    } = options

    /**
     * The command name.
     * @type {String}
     */
    this.name = name

    /**
     * The command description.
     * @type {String}
     */
    this.desc = desc

    /**
     * List of arguments that the command takes.
     * @type {Arg[]}
     */
    this.args = args

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
     * @type {function(CommandData): (CommandResults|String)}
     */
    this.action = action
  }

  /**
   * Get the info of this command.
   * @returns {String} A string describing the command. (**name <mand arg> (optional arg)** - *description*)
   */
  get info () {
    const args = this.args.reduce((accum, arg, index) => {
      const lastArg = index === this.args.length - 1

      const content = (index ? accum : ' ') + (arg.mand ? `<${arg.name}>` : `(${arg.name})`) + (lastArg ? '' : arg.delim || ' ')
      return content
    }, '')

    return `**${this.name}${args}** - *${this.desc}*`
  }
}

module.exports = Command

/**
 * Object passed to a command action.
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

/**
 * Object returned by a command.
 * @typedef {Object}         CommandResults
 * @prop    {String}         [CommandResults.content]                The resulting message content sent by the bot.
 * @prop    {Eris.Embed}     [CommandResults.embed]                  The resulting embed sent by the bot.
 * @prop    {Buffer}         [CommandResults.file]                   The resulting file sent by the bot.
 * @prop    {Object}         [CommandResults.options={}]             Options for the response message.
 * @prop    {String}         [CommandResults.channel]                The channel to send the resulting message. By default, it's the same channel the executing message was sent.
 * @prop    {Await}          [CommandResults.options.wait]           An action that is awaited after the results are processed.
 * @prop    {ReactInterface} [CommandResults.options.reactInterface] A react interface that is bound to the resulting message.
 * @prop    {Number}         [CommandResults.options.deleteAfter]    The number of milliseconds to wait before deleting the response.
 */
