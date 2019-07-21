/**
 * Class representing a command.
 */
class Command {
  /**
   * Create a command.
   * @class
   * @param {Object}                                                                   data                            The command data.
   * @prop  {String}                                                                   data.name                       The command name.
   * @prop  {String}                                                                   data.desc                       The command description.
   * @prop  {Object}                                                                   [data.options={}]               The command options.
   * @prop  {Argument[]}                                                               [data.options.args=[]]          The arguments for the command.
   * @prop  {String[]}                                                                 [data.options.aliases=[]]       Other names that trigger the command.
   * @prop  {String}                                                                   data.options.dbTable            The name of database table to fetch user data from (primary key must be named `id`).
   * @prop  {Boolean}                                                                  [data.options.restricted=false] Whether or not this command is restricted to admin only.
   * @prop  {function(CommandData): (CommandResults|CommandResults[]|String|String[])} data.action                     The command action.
   */
  constructor ({ name, desc, options = {}, action }) {
    const {
      args = [],
      aliases = [],
      dbTable,
      restricted = false
    } = options

    for (const arg of args) {
      if (arg.delim && arg.delim.length > 1) console.log('WARNING: Delimiters that are longer than 1 character will not work:\n' + arg.delim)
    }

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
     * The arguments for the command.
     * @type {Arg[]}
     */
    this.args = args

    /**
     * Other names that trigger the command.
     * @type {String[]}
     */
    this.aliases = aliases

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
     * @type {function(CommandData): (CommandResults|CommandResults[]|String|String[])}
     */
    this.action = action
  }

  /**
   * Get the info of this command.
   * @returns {String} A string describing the command. (**name <mandatory arg> (optional arg) (#number arg)** - *description*)
   */
  get info () {
    const args = this.args.reduce((accum, arg, index) => {
      const lastArg = index === this.args.length - 1

      const content = (index ? accum : ' ') + (arg.mand ? '<' : '(') + `${arg.type === 'number' ? '#' : ''}${arg.name}` + (arg.mand ? '>' : ')') + (lastArg ? '' : arg.delim || ' ')
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
 * Object returned by a command action.
 * @typedef {Object}         CommandResults
 * @prop    {String}         [CommandResults.content]                The resulting message content sent by the bot.
 * @prop    {Eris.Embed}     [CommandResults.embed]                  The resulting embed sent by the bot.
 * @prop    {Buffer}         [CommandResults.file]                   The resulting file sent by the bot.
 * @prop    {Object}         [CommandResults.options={}]             Options for the response message.
 * @prop    {String}         [CommandResults.channel]                The channel ID to send the resulting message. By default, it's the same channel the executing message was sent.
 * @prop    {Await}          [CommandResults.options.wait]           An action that is awaited after the results are processed.
 * @prop    {ReactInterface} [CommandResults.options.reactInterface] A react interface that is bound to the resulting message.
 * @prop    {Number}         [CommandResults.options.deleteAfter]    The number of milliseconds to wait before deleting the response.
 */

/**
 * Arguments that go into a command.
 * @typedef {Object}  Argument
 * @prop    {String}  Argument.name            The name of the argument.
 * @prop    {Boolean} [Argument.mand=false]    Whether the argument is mandatory for the command to work or not.
 * @prop    {String}  [Argument.delim=' ']     The delimiter (The character that separates it from the argument after it) for the argument.
 * @prop    {String}  [Argument.type='string'] The type of argument. ('string', 'number')
 */
