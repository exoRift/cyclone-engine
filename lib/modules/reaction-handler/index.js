const { inspect } = require('util')

const ReactCommand = require('../react-command')
const ReactInterface = require('../react-interface')

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
   * @prop  {ReactCommand[]|ReactCommand} [datareactCommands=[]]            Array of reaction commands to load initially.
   * @prop  {Object}                      [data.options={}]                 Options for the reaction handler.
   * @prop  {Number}                      [data.options.maxInterfaces=1500] The maximum amount of interfaces cached before they start getting deleted.
   * @prop  {Number[]}                    [data.options.ignoreCodes=[]]     The Discord error codes to ignore.
   */
  constructor ({ agent = {}, client, ownerID, knex, reactCommands = [], options = {} }) {
    const {
      maxInterfaces = 1500,
      ignoreCodes = []
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
     * @private
     * @type    {Map<String, ReactCommand>}
     */
    this._reactCommands = new Map()

    /**
     * Map of the interfaces bound to messages.
     * @private
     * @type    {Map<String, ReactInterface>}
     */
    this._reactInterfaces = new Map()

    /**
     * The Discord error codes to ignore.
     * @private
     * @type    {Number[]}
     */
    this._ignoreCodes = ignoreCodes

    /**
     * The maximum amount of interfaces cached before they start getting deleted.
     * @private
     * @type    {Number}
     */
    this._maxInterfaces = maxInterfaces < 3 ? 3 : maxInterfaces

    this.loadReactCommands(reactCommands)
  }

  /**
   * Handle an incoming Discord reaction.
   * @async
   * @param   {Eris.Message}                                             msg   The message reacted on.
   * @param   {String}                                                   emoji The emoji reacted with.
   * @param   {Eris.User}                                                user  The user who reacted.
   * @returns {Promise<ReactionHandlerResults>}                                The overall results of the react command.
   */
  async handle (msg, emoji, user) {
    if (!msg.content && !msg.embeds) return /* Uncached */

    const command = await this._getInterface(msg, emoji) || this._reactCommands.get(emoji.name)

    if (!command) return

    if (command.restricted) {
      if (command.designatedUsers) {
        if (!command.designatedUsers.includes(user.id)) return
      } else if (user.id !== msg.author.id) return
    }

    if (typeof command.action !== 'function') throw TypeError('React command action is not a function:\n' + command.emoji)

    let dbData
    if (command.dbTable) dbData = await this._handleDBRequest(command.dbTable, user.id)

    let results = await command.action({
      agent: this._agent,
      client: this._client,
      reactCommands: this._reactCommands,
      msg,
      emoji,
      user,
      userData: dbData,
      knex: this._knex,
      reactInterface: command.parentInterface
    })

    if (!(results instanceof Array)) results = [results]

    const responses = []

    for (const result of results) {
      if (!result) {
        responses.push({ options: {} })

        continue
      }

      const {
        content,
        embed,
        file,
        options: {
          channel = msg.channel.id
        } = {}
      } = typeof result === 'string' ? { content: result } : result

      const channelObject = this._client.guilds.get(this._client.channelGuildMap[channel]).channels.get(channel)

      if (!channelObject.permissionsOf(this._client.user.id).has('sendMessages')) {
        responses.push({ options: result.options || {} })

        continue
      }

      if (content || embed || file) {
        if (file && !(file.file instanceof Buffer)) throw TypeError('Supplied file not a Buffer instance:\n' + file.name)

        responses.push(channelObject.createMessage({ content, embed }, file)
          .catch((err) => {
            if (err.code === 50035 && (err.message.includes('length'))) {
              return channelObject.createMessage('Text was too long, sent as a file instead.', {
                name: 'Command Result.txt',
                file: Buffer.from(`${content || 'undefined'}\n\n${inspect(embed)}`)
              }).then((response) => { return { options: result.options || {}, response } })
            }

            if (this._ignoreCodes.includes(err.code)) return

            throw err
          })
          .then((response) => { return { options: result.options || {}, response } }))
      } else if (result.options) responses.push({ options: result.options })
    }

    return Promise.all(responses).then(this._successfulResponses.bind(this, { msg, user, command, foundReactInterface: command.parentInterface }))
  }

  /**
   * Tidy up after a successful response from a react command.
   * @private
   * @param   {Object}                 data                     General data from the message, user, and react command.
   * @prop    {Eris.Message}           data.msg                 The message that was reacted on.
   * @prop    {Eris.User}              data.user                The user that reacted.
   * @prop    {ReactCommand}           data.command             The command that was triggered.
   * @prop    {ReactInterface}         data.foundReactInterface If the reaction was an interface button, the interface it was a part of.
   * @param   {Object[]}               results                  The results of every message sent.
   * @prop    {Object}                 results.options          The resulting data/options of a message sent.
   * @prop    {Eris.Message}           results.response         The Eris message that was sent to Discord.
   * @returns {ReactionHandlerResults}                          Overall results from the react command.
   */
  async _successfulResponses ({ msg, user, command, foundReactInterface }, results) {
    for (const { options, response } of results) {
      const {
        wait,
        reactInterface,
        deleteAfter
      } = options

      if (wait) {
        if (this._agent._commandHandler) await this._agent._commandHandler._addAwait({ channel: msg.channel.id, user: user.id, response, wait })
        else throw Error('The command handler isn\'t enabled; enable it by passing an empty array to Agent.commands.')
      }

      if (reactInterface) await this.bindInterface(response, reactInterface)

      if (command.removeReaction) msg.removeReaction(command.emoji, user.id).catch((ignore) => ignore)

      if (foundReactInterface && foundReactInterface.deleteAfterUse) {
        const buttons = foundReactInterface.buttons.values()

        for (const button of buttons) msg.removeReaction(button.emoji)

        this._reactInterfaces.delete(msg.id)
      }

      if (deleteAfter) {
        if (!response) throw Error('Cannot delete a non-existent response with a delay of:\n' + deleteAfter)

        if (typeof deleteAfter !== 'number') throw TypeError('Supplied deleteAfter delay is not a number:\n' + deleteAfter)

        setTimeout(() => response.delete(), deleteAfter)
      }
    }

    return {
      command,
      reactInterface: foundReactInterface,
      results
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
    if (!msg) throw Error('Cannot attach an interface to a non-existent response.')
    if (!(reactInterface instanceof ReactInterface)) throw TypeError('Supplied react interface is not a ReactInterface instance:\n' + reactInterface)

    if (this._reactInterfaces.size > this._maxInterfaces) {
      const deleteAmount = parseInt(this._maxInterfaces / 3)

      const keys = this._reactInterfaces.keys()

      for (let i = 0; i < deleteAmount; i++) this._reactInterfaces.delete(keys.next().value)
    }

    this._reactInterfaces.set(msg.id, reactInterface)

    const buttons = reactInterface.buttons.values()
    for (const { emoji } of buttons) msg.addReaction(emoji)

    return reactInterface
  }

  /**
   * Get a bound interface of a message.
   * @private
   * @async
   * @param   {Eris.Message}                      msg   The message.
   * @param   {Object}                            emoji The emoji reacted with.
   * @returns {Promise<ReactInterface|Undefined>}       The bound interface.
   */
  async _getInterface (msg, emoji) {
    const reactInterface = this._reactInterfaces.get(msg.id)

    if (reactInterface) {
      const emojiName = emoji.id
        ? `${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}`
        : emoji.name

      const command = reactInterface.buttons.get(emojiName)

      return command
    }
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
    if (!this._knex) throw Error('QueryBuilder was not supplied to ReactionHandler! Attempted to fetch table:\n' + table)

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
    if (!(reactCommand instanceof ReactCommand)) throw TypeError('Supplied react command not a ReactCommand instance:\n' + reactCommand)

    this._reactCommands.set(reactCommand.emoji, reactCommand)
  }
}

module.exports = ReactionHandler

/**
 * Object returned by a react command.
 * @typedef {Object}         ReactionHandlerResults
 * @prop    {Command}        ReactionHandlerResults.command                        The command that was triggered.
 * @prop    {ReactInterface} ReactionHandlerResults.foundReactInterface            If the command was an interface button, the interface it was a part of.
 * @prop    {Object[]}       ReactionHandlerResults.results                        The results of every message sent.
 * @prop    {Await}          ReactionHandlerResults.results.options.wait           An action that is awaited after the results are processed.
 * @prop    {ReactInterface} ReactionHandlerResults.results.options.reactInterface A react interface that is bound to the resulting message.
 * @prop    {Number}         ReactionHandlerResults.results.options.deleteAfter    How long until the response is deleted.
 * @prop    {Eris.Message}   ReactionHandlerResults.results.response               The response sent to Discord.
 */
