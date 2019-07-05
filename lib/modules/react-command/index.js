/**
 * Class representing a react command.
 */
class ReactCommand {
  /**
   * Construct a react command.
   * @class
   * @param {Object}                                                   data                                The react command data.
   * @prop  {String}                                                   data.emoji                          The emoji that triggers the command.
   * @prop  {String}                                                   data.desc                           The description of the react command.
   * @prop  {function(ReactCommandData): (ReactCommandResults|String)} data.action                         The react command action.
   * @prop  {Object}                                                   data.options                        Additional options for the react command
   * @prop  {Boolean}                                                  [data.options.restricted=false]     Whether the react command is restricted to selected users or not.
   * @prop  {String[]|String}                                          [data.options.designatedUsers]      The IDs of the users who can use the react command. By default, if restricted is true, it's the owner of the message reacted on.
   * @prop  {String}                                                   [data.options.dbTable]              Name of database table to fetch user data from (primary key must be named `id`).
   * @prop  {Boolean}                                                  [data.options.removeReaction=false] Whether the triggering reaction is removed after executed or not.
   */
  constructor ({ emoji, desc, action, options = {} }) {
    const {
      restricted,
      designatedUsers,
      dbTable,
      removeReaction
    } = options

    /**
     * The emoji that triggers the command.
     * @type {String}
     */
    this.emoji = emoji

    /**
     * The description of the react command.
     * @type {String}
     */
    this.desc = desc

    /**
     * The react command action.
     * @type {function(ReactCommandData): (ReactCommandResults|String)}
     */
    this.action = action

    /**
     * Whether the interface is restricted to selected users or not.
     * @type {Boolean}
     */
    this.restricted = restricted

    /**
     * The IDs of the users who can use the interface.
     * @type {String[]}
     */
    if (designatedUsers) this.designatedUsers = designatedUsers instanceof Array ? designatedUsers : [designatedUsers]

    /**
     * Name of database table to fetch user data from (primary key must be named `id`).
     * @private
     * @type    {String}
     */
    this._dbTable = dbTable

    /**
     * Whether the triggering reaction is removed after executed or not.
     * @private
     * @type    {Boolean}
     */
    this._removeReaction = removeReaction
  }

  /**
   * Get the info of this react command.
   * @returns {String} A string describing the react command. (**name <mand arg> (optional arg)** - *description*)
   */
  get info () {
    return `**${this.emoji}** - *${this.desc}*`
  }
}

module.exports = ReactCommand

/**
 * Object passed to a react command action.
 * @typedef {Object}                    ReactCommandData
 * @prop    {Agent}                     ReactCommandData.agent          The agent managing the bot.
 * @prop    {Eris.Client}               ReactCommandData.client         The Eris client.
 * @prop    {Map<String, ReactCommand>} ReactCommandData.reactCommands  The list of bot react commands.
 * @prop    {Eris.Message}              ReactCommandData.msg            The message reacted on
 * @prop    {String}                    ReactCommandData.emoji          The emoji reacted with.
 * @prop    {Eris.User}                 ReactCommandData.user           The user who reacted.
 * @prop    {Object}                    ReactCommandData.userData       The table data fetched where `id` is the user's ID (Requested with dbData).
 * @prop    {QueryBuilder}              ReactCommandData.knex           The simple-knex query builder used by the reaction handler.
 * @prop    {ReactInterface}            ReactCommandData.reactInterface If the react command was a button, the interface it was a part of.
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
