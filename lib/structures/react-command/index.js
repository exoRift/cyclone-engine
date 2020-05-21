/**
 * A class used to register commands for the command handler
 */
class ReactCommand {
  /**
   * Construct a react command
   * @class
   * @param {Object}             data                                The react command data
   * @prop  {String}             data.emoji                          The emoji that triggers the command
   * @prop  {String}             data.desc                           The description of the react command
   * @prop  {Object}             data.options                        Additional options for the react command
   * @prop  {Boolean}            [data.options.restricted=false]     Whether or not this command is restricted to admin only
   * @prop  {Boolean}            [data.options.removeReaction=false] Whether the triggering reaction is removed after executed or not
   * @prop  {Boolean}            [data.options.guildOnly=false]      Whether or not this command can only be triggered in guilds as opposed to DMs
   * @prop  {Number}             [data.options.authLevel=0]          The minimum auth level required to execute this command
   * @prop  {reactCommandAction} data.action                         The react command action
   */
  constructor ({ emoji, desc, options = {}, action }) {
    const {
      restricted = false,
      removeReaction = false,
      guildOnly = false,
      authLevel
    } = options

    /**
     * The emoji that triggers the command
     * @type {String}
     */
    this.emoji = emoji

    /**
     * The description of the react command
     * @type {String}
     */
    this.desc = desc

    /**
     * The options for the react command
     * @type {Object}
     * @prop {Boolean} restricted     Whether or not this command is restricted to admin only
     * @prop {Boolean} removeReaction Whether the triggering reaction is removed after executed or not
     * @prop {Boolean} guildOnly      Whether or not this command can only be triggered in guilds as opposed to DMs
     * @prop {Number}  authLevel      The minimum auth level required to execute this command
     */
    this.options = {
      restricted,
      removeReaction,
      guildOnly,
      authLevel: parseInt(authLevel) || 0
    }

    /**
     * The react command action
     * @type {reactCommandAction}
     */
    this.action = action
  }

  /**
   * Get the info of this react command
   * @type    {String}
   * @example          '**emoji** - *description*'
   */
  get info () {
    return `${this.options.restricted ? '~~' : ''}**${this.emoji}** - *${this.desc}*${this.options.restricted ? '~~' : ''}`
  }
}

module.exports = ReactCommand

/**
 * The react command action
 * @callback                                                   reactCommandAction
 * @param    {ReactCommandData}                                data               Data passed from the handler
 * @returns  {CommandResults[]|CommandResults|String[]|String}                    Data to respond with
 */

/**
 * The object passed to a react command action
 * @typedef {Object}                    ReactCommandData
 * @prop    {Agent}                     ReactCommandData.agent           The agent managing the bot
 * @prop    {Eris.Client}               ReactCommandData.client          The Eris client
 * @prop    {Map<String, ReactCommand>} ReactCommandData.reactCommands   The list of bot react commands
 * @prop    {Eris.Message}              ReactCommandData.msg             The message reacted on
 * @prop    {String}                    ReactCommandData.emoji           The emoji reacted with
 * @prop    {Eris.User}                 ReactCommandData.user            The user who reacted
 * @prop    {Object}                    ReactCommandData.attachments     User-supplied data that is passed to commands
 * @prop    {ReactInterface}            ReactCommandData.parentInterface If the react command was a button, the interface it was a part of
 */
