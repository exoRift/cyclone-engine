const ReactCommand = require('../react-command')
const ReactInterface = require('../react-interface')

/**
 * A class representing the reaction handler.
 */
class ReactionHandler {
  /**
   * Construct a reaction handler.
   * @class
   * @param {Object}                      data               The reaction handler data.
   * @prop  {Agent}                       [data.agent]       The agent managing the bot.
   * @prop  {Eris.Client}                 data.client        The Eris client.
   * @prop  {String}                      data.ownerID       The ID of the bot owner.
   * @prop  {QueryBuilder}                [data.knex]        The simple-knex query builder.
   * @prop  {reactCommand[]|reactCommand} [reactCommands=[]] Array of reaction commands to load initially.
   */
  constructor ({ agent = {}, client, ownerID, knex, reactCommands = [] }) {
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
     * @type {Map<String, ReactCommand>}
     */
    this._reactCommands = new Map()

    /**
     * Map of the interfaces bound to messages.
     * @type {Map<String, ReactInterface>}
     */
    this._reactInterfaces = new Map()

    this.loadReactCommands(reactCommands)
  }

  /**
   * Handle an incoming Discord reaction.
   * @async
   * @param   {Eris.Message}                        msg   The message reacted on.
   * @param   {String}                              emoji The emoji reacted with.
   * @param   {Eris.User}                           user  The user who reacted.
   * @returns {Promise<ReactCommandResults|String>}       The results of the reaction command.
   */
  async handle (msg, emoji, user) {
    const reactInterface = this._reactInterfaces.get(msg.id)
    let command
    if (reactInterface) {
      command = reactInterface.buttons[emoji]
      if (!command.designatedUser && user.id === command.designatedUser) return
    } else command = this._reactCommands.get(emoji)

    if (!command) return

    let dbData
    if (command.dbTable) dbData = await this._handleDBRequest(command.dbTable, user.id)

    const result = await command.action({
      agent: this._agent,
      client: this._client,
      reactCommands: this._reactCommands,
      msg,
      emoji,
      user,
      userData: dbData,
      knex: this._knex
    })
  }

  /**
   * Bind an interface to a command.
   * @async
   * @param   {Eris.Message}    msg            The message to bind to.
   * @param   {ReactInterface}  reactInterface The interface to bind.
   * @returns {Promise<Object>}                The resulting interface data.
   */
  async bindInterface (msg, reactInterface) {
    if (!(reactInterface instanceof ReactInterface)) throw TypeError('Supplied react interface not ReactInterface instance:\n' + reactInterface)
  }

  /**
   * Handle commands that request a table.
   * @private
   * @async
   * @param   {String}          table The name of the table.
   * @param   {String}          id    The ID of the user
   * @returns {Promise<Object>}       The user's data.
   */
  async _handleDBRequest (table, id) {
    if (!this._knex) throw Error('QueryBuilder was not supplied to CommandHandler!')
    await this._knex.insert({ table, data: { id } }).catch((ignore) => ignore)
    return this._knex.get({ table, where: { id } })
  }

  /**
   * Load reaction commands.
   * @param {ReactCommand[]|ReactCommand} reactCommands The reaction command(s) to load.
   */
  loadReactCommands (reactCommands) {
    if (reactCommands instanceof Array) {
      for (const reactCommand of reactCommands) this._loadReactCommand(reactCommand)
    } else this._loadReactCommand(reactCommands)
  }

  /**
   * Load a reaction command
   * @param {ReactCommand} reactCommand The reaction command to load.
   */
  _loadReactCommand (reactCommand) {
    if (!(reactCommand instanceof ReactCommand)) throw TypeError('Supplied reaction command not ReactCommand instance:\n' + reactCommand.emoji)
    this._reactCommands.set(reactCommand.emoji, reactCommand)
  }
}

module.exports = ReactionHandler

/**
 * @typedef {Object} ReactCommandResults
 */
