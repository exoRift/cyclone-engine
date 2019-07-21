/**
 * A class representing an await for a message.
 */
class Await {
  /**
   * Create an Await.
   * @class
   * @param {Object}                                                                 data                              The await data.
   * @prop  {Object}                                                                 [data.options={}]                 The options for the await
   * @prop  {Argument[]}                                                             [data.options.args=[]]            The arguments for the await.
   * @prop  {function(prefix: String, msg: Eris.Message)}                            [data.options.check=()=>true]     The condition to be met for the await to trigger.
   * @prop  {Number}                                                                 [data.options.timeout=15000]      How long until the await cancels.
   * @prop  {Boolean}                                                                [data.options.oneTime=false]      Whether a non-triggering message cancels the await.
   * @prop  {Boolean}                                                                [data.options.refreshOnUse=false] Whether the timeout for the await refreshes after a use.
   * @prop  {String}                                                                 [data.options.channel]            The channel to await the message. (By default, it's the channel the command was called in.)
   * @prop  {function(AwaitData): (CommandResults|CommandResults[]|String|String[])} data.action                       The await action.
   */
  constructor ({ options = {}, action }) {
    const {
      args = [],
      check = () => true,
      timeout = 15000,
      oneTime,
      refreshOnUse,
      channel
    } = options

    for (const arg of args) {
      if (arg.delim && arg.delim.length > 1) console.error('WARNING: Delimiters that are longer than 1 character will not work:\n' + arg.delim)
    }

    /**
     * The arguments for the await.
     * @type {Object[]}
     */
    this.args = args

    /**
     * The condition to be met for the await to trigger.
     * @type {function(prefix: String, msg: Eris.Message)}
     */
    this.check = check

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
     * The channel to await the message. (By default, it's the channel the command was called in.)
     * @type {String}
     */
    if (channel) this.channel = channel

    /**
     * The await action.
     * @type {function(AwaitData): (CommandResults|String)}
     */
    this.action = action
  }

  /**
   * Start the delete timer for the await.
   * @async
   * @param   {Object}             data                 Further await data.
   * @prop    {String}             data.id              The ID of the await in its parent map.
   * @prop    {Map<String, Await>} data.awaitMap        The map that the await is stored in.
   * @prop    {Eris.Message}       data.triggerResponse The response to the command that initiated the await.
   * @returns {Promise<Await>}                          The await.
   */
  async startTimer ({ id, awaitMap, triggerResponse }) {
    /**
     * The ID of the await.
     * @private
     * @type {String}
     */
    this._id = id

    /**
     * The map that the await is stored in.
     * @private
     * @type {Map<String, Await>}
     */
    this._awaitMap = awaitMap

    /**
     * The response to the command that initiated the await.
     * @private
     * @type {Eris.Message}
     */
    this.triggerResponse = triggerResponse

    /**
     * The delete timer for the await.
     * @private
     * @type {Timeout}
     */
    this._timer = setTimeout(() => this.clear(), this.timeout)

    return this
  }

  /**
   * Clear the await from its storage.
   * @async
   * @returns {Promise<Await>} The await that was cleared.
   */
  async clear () {
    if (!this._timer) throw Error('You have not started the timer yet!')

    clearTimeout(this._timer)

    this._awaitMap.delete(this._id)

    return this
  }

  /**
   * Refresh the delete timer for the await
   * @async
   * @returns {Promise<Await>} The await.
   */
  async refresh () {
    if (!this._timer) throw Error('You have not started the timer yet!')

    clearTimeout(this._timer)

    /**
     * The delete timer for the await.
     * @private
     * @type {Timeout}
     */
    this._timer = setTimeout(() => this.clear(), this.timeout)

    return this
  }
}

module.exports = Await

/**
 * Object passed to a command action.
 * @typedef {Object}                AwaitData
 * @prop    {Agent}                 agent             The agent managing the bot.
 * @prop    {Eris.Client}           client            The Eris client.
 * @prop    {Map<String, Command>}  commands          The list of bot commands.
 * @prop    {Map<String, Replacer>} replacers         The list of bot replacers.
 * @prop    {Eris.Message}          msg               The message sent by the user.
 * @prop    {String[]}              args              The arguments supplied by the user.
 * @prop    {Object}                userData          The data of the user in the database if requested.
 * @prop    {QueryBuilder}          knex              The simple-knex query builder used by the command handler.
 * @prop    {Eris.Message}          initResponse The bot's response to the message that initiated the await.
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
