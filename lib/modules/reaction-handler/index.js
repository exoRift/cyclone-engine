const {
  inspect
} = require('util')

const ReactCommand = require('../react-command')
const ReactInterface = require('../react-interface')
const Await = require('../await')

/**
 * A class representing the reaction handler.
 */
class ReactionHandler {
  /**
   * Construct a reaction handler.
   * @class
   * @param {Object}                      data                              The reaction handler data.
   * @prop  {Agent}                       [data.agent]                      The agent managing the bot.
   * @prop  {Eris.Client}                 data.client                       The Eris client.
   * @prop  {String}                      data.ownerID                      The ID of the bot owner.
   * @prop  {QueryBuilder}                [data.knex]                       The simple-knex query builder.
   * @prop  {reactCommand[]|reactCommand} [datareactCommands=[]]            Array of reaction commands to load initially.
   * @prop  {Object}                      [data.options={}]                 Options for the reaction handler.
   * @prop  {Number}                      [data.options.maxInterfaces=1500] The maximum amount of interfaces cached before they start getting deleted.
   */
  constructor ({ agent = {}, client, ownerID, knex, reactCommands = [], options = {} }) {
    const {
      maxInterfaces = 1500
    } = options

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

    /**
     * The maximum amount of interfaces cached before they start getting deleted.
     * @type {Number}
     */
    this._maxInterfaces = maxInterfaces

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
    if (!msg.content && !msg.embeds) return /* Uncached */

    const foundReactInterface = this._reactInterfaces.get(msg.id)
    let command

    if (foundReactInterface) {
      let emojiName
      if (emoji.id) {
        emojiName = `${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}`
      } else emojiName = emoji.name

      command = foundReactInterface.buttons.get(emojiName)

      if (!command) return

      if (command.restricted) {
        if (command.designatedUsers) {
          if (!command.designatedUsers.includes(user.id)) return
        } else if (user.id !== msg.author.id) return
      }
    } else command = this._reactCommands.get(emoji.name)

    if (!command) return

    let dbData
    if (command._dbTable) dbData = await this._handleDBRequest(command._dbTable, user.id)

    const result = await command.action({
      agent: this._agent,
      client: this._client,
      reactCommands: this._reactCommands,
      msg,
      emoji,
      user,
      userData: dbData,
      knex: this._knex,
      reactInterface: foundReactInterface
    })

    const {
      content,
      embed,
      file,
      reactInterface,
      wait
    } = typeof result === 'string' ? { content: result } : result || {}

    const _successfulResponse = (rsp) => {
      if (wait) {
        if (!(wait instanceof Await)) throw TypeError('Supplied wait is not an Await instance:\n' + wait)
        this._agent._commandHandler._addAwait({ channel: msg.channel.id, user: user.id, rsp, wait })
      }

      if (reactInterface) {
        if (!(reactInterface instanceof ReactInterface)) throw TypeError('Supplied react interface is not a ReactInterface instance:\n' + foundReactInterface.buttons)
        this.bindInterface(rsp, reactInterface)
      }

      if (command._removeReaction) msg.removeReaction(command.emoji, user.id).catch((ignore) => ignore)

      if (foundReactInterface && foundReactInterface._deleteAfterUse) {
        const buttons = foundReactInterface.buttons.values()

        for (const button of buttons) msg.removeReaction(button.emoji)

        this._reactInterfaces.delete(msg.id)
      }

      return { command, content, embed, file, wait, rsp }
    }

    if (!result || !msg.channel.permissionsOf(this._client.user.id).has('sendMessages')) return _successfulResponse()

    if (content || embed || file) {
      if (file && !(file instanceof Buffer)) throw TypeError('Supplied file not a Buffer instance:\n', file)
      return msg.channel.createMessage({ content, embed }, file)
        .catch((err) => {
          if (err.code === 50035 && (err.message.includes('length') || err.message.includes('size'))) {
            return msg.channel.createMessage('Text was too long, sent as a file instead.', {
              name: 'Command Result.txt',
              file: Buffer.from(`${content || 'undefined'}\n\n${inspect(embed)}`)
            }).then(_successfulResponse)
          }
          throw err
        })
        .then(_successfulResponse)
    }
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
    if (this._reactInterfaces.size >= this._maxInterfaces) {
      const keys = this._reactInterfaces.keys.slice(0, 19)

      for (const key of keys) this._reactInterfaces.delete(key)
    }

    this._reactInterfaces.set(msg.id, reactInterface)

    const buttons = reactInterface.buttons.values()
    for (const { emoji } of buttons) msg.addReaction(emoji)

    return reactInterface
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
    if (!this._knex) throw Error('QueryBuilder was not supplied to ReactionHandler!')
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
 * @typedef {Object}       ReactCommandResults
 * @prop    {Command}      ReactCommandResults.command The object of the react command called.
 * @prop    {String}       ReactCommandResults.content The resulting message content sent by the bot.
 * @prop    {Eris.Embed}   ReactCommandResults.embed   The resulting embed sent by the bot.
 * @prop    {Buffer}       ReactCommandResults.file    The resulting file sent by the bot.
 * @prop    {Await}        ReactCommandResults.wait    An action that is awaited after the results are processed.
 * @prop    {Eris.Message} ReactCommandResults.rsp     The message object sent to Discord.
 */
