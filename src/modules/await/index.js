/**
 * A class representing an await for a message.
 */
class Await {
  /**
   * Create an Await.
   * @class
   * @param {Object}                                         data                              The await data.
   * @prop  {function(AwaitData): (CommandResults|String)}   data.action                       The await action.
   * @prop  {Object}                                         [data.options={}]                 The options for the await
   * @prop  {Number}                                         [data.options.timeout=15000]      How long until the await cancels.
   * @prop  {Boolean}                                        [data.options.oneTime=false]      Whether a non-triggering message cancels the await.
   * @prop  {Boolean}                                        [data.options.refreshOnUse=false] Whether the timeout for the await refreshes after a use.
   * @prop  {function(prefix: String, msg: Eris.Message)}    [data.options.check=()=>true]     The condition to be met for the await to trigger.
   * @prop  {Object[]}                                       [data.options.args=[]]            The arguments for the await.
   * @prop  {String}                                         [data.options.channel]            The channel to await the message. (By default, it's the channel the command was called in.)
   */
  constructor ({ action, options = {} }) {
    const {
      timeout = 15000,
      oneTime,
      refreshOnUse,
      check = () => true,
      args = [],
      channel
    } = options

    /**
     * The await action.
     * @type {function(AwaitData): (CommandResults|String)}
     */
    this.action = action

    /**
     * How long until the await cancels.
     * @type {Number}
     */
    this.timeout = timeout

    /**
     * Whether a non-triggering message cancels the await.
     * @type {Boolean}
     */
    this.oneTime = oneTime

    /**
     * Whether the timeout for the await refreshes after a use.
     * @type {Boolean}
     */
    this.refreshOnUse = refreshOnUse

    /**
     * The condition to be met for the await to trigger.
     * @type {function(prefix: String, msg: Eris.Message)}
     */
    this.check = check

    /**
     * The arguments for the await.
     * @type {Object[]}
     */
    this.args = args

    /**
     * The channel to await the message. (By default, it's the channel the command was called in.)
     * @type {String}
     */
    if (channel) this.channel = channel
  }
}

module.exports = Await

/**
 * Object passed to a command action.
 * @typedef {Object}                AwaitData
 * @prop    {Agent}                 agent       The agent managing the bot.
 * @prop    {Eris.Client}           client      The Eris client.
 * @prop    {Map<String, Command>}  commands    The list of bot commands.
 * @prop    {Map<String, Replacer>} replacers   The list of bot replacers.
 * @prop    {Eris.Message}          msg         The message sent by the user.
 * @prop    {String[]}              args        The arguments supplied by the user.
 * @prop    {Object}                userData    The data of the user in the database if requested.
 * @prop    {QueryBuilder}          knex        The simple-knex query builder used by the command handler.
 * @prop    {Eris.Message}          lastResponse The last message the bot sent before registering an await.
 */

/**
 * Object returned by a command.
 * @typedef  {Object}       CommandResults
 * @prop     {Command}      command        The object of the command called.
 * @prop     {String}       content        The resulting message content sent by the bot.
 * @prop     {Eris.Embed}   embed          The resulting embed sent by the bot.
 * @prop     {Buffer}       file           The resulting file sent by the bot.
 * @prop     {Eris.Message} rsp            The message object sent to Discord.
 */
