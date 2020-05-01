/**
 * A class used to register commands for the command handler.
 */
class ReactCommand {
  /**
   * Construct a react command.
   * @class
   * @param {Object}             data                                The react command data.
   * @prop  {String}             data.emoji                          The emoji that triggers the command.
   * @prop  {String}             data.desc                           The description of the react command.
   * @prop  {Object}             data.options                        Additional options for the react command
   * @prop  {Boolean}            [data.options.restricted=false]     Whether the react command is restricted to selected users or not.
   * @prop  {String[]|String}    [data.options.designatedUsers]      The IDs of the users who can use the react command. By default, if restricted is true, it's the owner of the message reacted on.
   * @prop  {String}             [data.options.dbTable]              Name of database table to fetch user data from (primary key must be named `id`).
   * @prop  {Boolean}            [data.options.removeReaction=false] Whether the triggering reaction is removed after executed or not.
   * @prop  {reactCommandAction} data.action                         The react command action.
   */
  constructor ({ emoji, desc, options = {}, action }) {
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
     * Whether the interface is restricted to selected users or not.
     * @type {Boolean}
     */
    this.restricted = restricted

    /**
     * The IDs of the users who can use the interface.
     * @type {String[]}
     */
    if (designatedUsers) this.designatedUsers = Array.isArray(designatedUsers) ? designatedUsers : [designatedUsers]

    /**
     * Name of database table to fetch user data from (primary key must be named `id`).
     * @type {String}
     */
    this.dbTable = dbTable

    /**
     * Whether the triggering reaction is removed after executed or not.
     * @type {Boolean}
     */
    this.removeReaction = removeReaction

    /**
     * The react command action.
     * @type {reactCommandAction}
     */
    this.action = action
  }

  /**
   * Get the info of this react command.
   * @type    {String}
   * @example          '**emoji** - *description*'
   */
  get info () {
    return `${this.restricted ? '~~' : ''}**${this.emoji}** - *${this.desc}*${this.restricted ? '~~' : ''}`
  }
}

module.exports = ReactCommand

/**
 * The react command action.
 * @callback                                                   reactCommandAction
 * @param    {ReactCommandData}                                data               Data passed from the handler.
 * @returns  {CommandResults[]|CommandResults|String[]|String}                    Data to respond with.
 */

/**
 * The object passed to a react command action.
 * @typedef {Object}                    ReactCommandData
 * @prop    {Agent}                     ReactCommandData.agent           The agent managing the bot.
 * @prop    {Eris.Client}               ReactCommandData.client          The Eris client.
 * @prop    {Map<String, ReactCommand>} ReactCommandData.reactCommands   The list of bot react commands.
 * @prop    {Eris.Message}              ReactCommandData.msg             The message reacted on
 * @prop    {String}                    ReactCommandData.emoji           The emoji reacted with.
 * @prop    {Eris.User}                 ReactCommandData.user            The user who reacted.
 * @prop    {Object}                    ReactCommandData.userData        The table data fetched where `id` is the user's ID (Requested with dbData).
 * @prop    {QueryBuilder}              ReactCommandData.knex            The simple-knex query builder used by the reaction handler.
 * @prop    {ReactInterface}            ReactCommandData.parentInterface If the react command was a button, the interface it was a part of.
 */
