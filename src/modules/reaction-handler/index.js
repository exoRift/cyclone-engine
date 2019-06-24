const ReactionCommand = require('../reaction-command')

/**
 * A class representing the reaction handler.
 */
class ReactionHandler {
  /**
   * Construct a reaction handler.
   * @class
   * @param {Object}       data                                       The reaction handler data.
   * @prop  {Agent}        [data.agent]                               The agent managing the bot.
   * @prop  {Eris.Client}  data.client                                The Eris client.
   * @prop  {String}       data.ownerID                               The ID of the bot owner.
   * @prop  {QueryBuilder} [data.knex]                                The simple-knex query builder.
   * @prop  {reactionCommand[]|reactionCommand} [reactionCommands=[]] Array of reaction commands to load initially.
   */
  constructor ({ agent = {}, client, ownerID, knex, reactionCommands = [] }) {
    /**
     * The agent managing the bot.
     * @private
     * @type    {Agent}
     */
    this._agent = agent

    /**
     * The Eris Client.
     * @private
     * @type    {Eris}
     */
    this._client = client

    /**
     * The ID of the bot owner.
     * @private
     * @type    {String}
     */
    this._ownerID = ownerID

    /**
     * The simple-knex query builder.
     * @private
     * @type    {QueryBuilder}
     */
    this._knex = knex

    /**
     * Map of the reaction commands.
     * @type {Map<String, ReactionCommand>}
     */
    this._reactionCommands = new Map()

    this.loadReactionCommands(reactionCommands)
  }

  /**
   * Handle an incoming Discord reaction.
   * @async
   * @param   {Eris.Message}                    msg   The message reacted on.
   * @param   {String}                          emoji The emoji reacted with.
   * @param   {Eris.User}                       user  The user who reacted.
   * @returns {Promise<ReactionCommandResults>}       The results of the reaction command.
   */
  async handle (msg, emoji, user) {

  }

  /**
   * Load reaction commands.
   * @param {ReactionCommand[]|ReactionCommand} reactionCommands The reaction command(s) to load.
   */
  loadReactionCommands (reactionCommands) {
    if (reactionCommands instanceof Array) {
      for (const reactionCommand of reactionCommands) this._loadReactionCommand(reactionCommand)
    } else this._loadReactionCommand(reactionCommands)
  }

  /**
   * Load a reaction command
   * @param {ReactionCommand} reactionCommand The reaction command to load.
   */
  _loadReactionCommand (reactionCommand) {
    if (!(reactionCommand instanceof ReactionCommand)) throw TypeError('Supplied reaction command not ReactionCommand instance:\n' + reactionCommand.emoji)
    this._reactionCommands.set(reactionCommand.emoji, reactionCommand)
  }
}

module.exports = ReactionHandler
