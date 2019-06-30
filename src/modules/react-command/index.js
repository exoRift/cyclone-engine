/**
 * Class representing a react command.
 */
class ReactCommand {
  /**
   * Construct a react command.
   * @class
   * @param {Object}                                                   data                            The react command data.
   * @prop  {String}                                                   data.emoji                      The emoji that triggers the command.
   * @prop  {String}                                                   data.desc                       The description of the react command.
   * @prop  {function(ReactCommandData): (ReactCommandResults|String)} data.action                     The react command action.
   * @prop  {Object}                                                   data.options                    Additional options for the react command
   * @prop  {Boolean}                                                  [data.options.restricted=false] Whether the react command is restricted to selected users or not.
   * @prop  {String[]|String}                                          [data.options.designatedUsers]  The IDs of the users who can use the react command. By default, if restricted is true, it's the owner of the message reacted on.
   */
  constructor ({ emoji, desc, action, options = {} }) {
    const {
      restricted,
      designatedUsers
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
     * @type {String[]|String}
     */
    this.designatedUsers = designatedUsers
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
 * @typedef {Object}                    ReactCommandData
 * @prop    {Agent}                     ReactCommandData.agent         The agent managing the bot.
 * @prop    {Eris.Client}               ReactCommandData.client        The Eris client.
 * @prop    {Map<String, ReactCommand>} ReactCommandData.reactCommands The list of bot react commands.
 * @prop    {Eris.Message}              ReactCommandData.msg           The message reacted on
 * @prop    {String}                    ReactCommandData.emoji         The emoji reacted with.
 * @prop    {Eris.User}                 ReactCommandData.user          The user who reacted.
 * @prop    {Object}                    ReactCommandData.userData      The table data fetched where `id` is the user's ID.
 * @prop    {QueryBuilder}              ReactCommandData.knex          The simple-knex query builder used by the reaction handler.
 * @prop    {ReactInterface}            ReactCommandData.interface     If the react command was a button, the interface it was a part of.
 */

/**
 * @typedef {Object}     ReactCommandResults
 * @prop    {Command}    ReactCommandResults.command The object of the react command called.
 * @prop    {String}     ReactCommandResults.content The resulting message content sent by the bot.
 * @prop    {Eris.Embed} ReactCommandResults.embed   The resulting embed sent by the bot.
 * @prop    {Buffer}     ReactCommandResults.file    The resulting file sent by the bot.
 * @prop    {Await}      ReactCommandResults.wait    An action that is awaited after the results are processed.
 */
