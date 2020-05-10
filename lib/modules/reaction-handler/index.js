const {
  inspect
} = require('util')

const {
  ReactCommand,
  ReactInterface
} = require('../../structures/')

const {
  IgnoredError
} = require('../../errors/')

/**
 * The module that handles incoming reactions
 */
class ReactionHandler {
  /**
   * Construct a reaction handler
   * @class
   * @param {Object}                      data                              The reaction handler data
   * @prop  {Agent}                       [data.agent]                      The agent managing the bot
   * @prop  {Eris.Client}                 data.client                       The Eris client
   * @prop  {String}                      data.ownerID                      The ID of the bot owner
   * @prop  {ReactCommand[]|ReactCommand} [data.reactCommands=[]]           Array of reaction commands to load initially
   * @prop  {Object}                      [data.options={}]                 Options for the reaction handler
   * @prop  {Number}                      [data.options.maxInterfaces=1500] The maximum amount of interfaces cached before they start getting deleted
   */
  constructor ({ agent = {}, client, ownerID, reactCommands = [], options = {} }) {
    const {
      maxInterfaces = 1500
    } = options

    /**
     * The agent managing the bot
     * @private
     * @type    {Agent}
     */
    this._agent = agent

    /**
     * The Eris Client
     * @private
     * @type    {Eris}
     */
    this._client = client

    /**
     * The ID of the bot owner
     * @private
     * @type    {String}
     */
    this._ownerID = ownerID

    /**
     * Map of the reaction commands
     * @private
     * @type    {Map<String, ReactCommand>}
     */
    this._reactCommands = new Map()

    /**
     * Map of the interfaces bound to messages
     * @private
     * @type    {Map<String, ReactInterface>}
     */
    this._reactInterfaces = new Map()

    /**
     * The options for the reaction handler
     * @private
     * @type    {Object}
     * @prop    {Number} maxInterfaces The maximum amount of interfaces cached before they start getting deleted. MINIMUM: 3
     */
    this._options = {
      maxInterfaces: maxInterfaces < 3 ? 3 : maxInterfaces
    }

    this.loadReactCommands(reactCommands)
  }

  /**
   * Handle an incoming Discord reaction
   * @async
   * @param   {Eris.Message}                    msg   The message reacted on
   * @param   {String}                          emoji The data of the emoji reacted with
   * @param   {Eris.User}                       user  The user who reacted
   * @returns {Promise<ReactionHandlerResults>}       The overall results of the react command
   */
  async handle (msg, emoji, user) {
    if (!msg.content && !msg.embeds) return /* Uncached */

    const command = await this._getInterface(msg, emoji) || this._reactCommands.get(emoji.name)

    if (!command) return

    if (command.options.restricted) {
      if (command.options.designatedUsers) {
        if (!command.options.designatedUsers.includes(user.id)) return
      } else if (user.id !== msg.author.id) return
    }

    if (typeof command.action !== 'function') throw TypeError('React command action is not a function:\n' + command.emoji)

    let commandResults = await command.action({
      agent: this._agent,
      client: this._client,
      reactCommands: this._reactCommands,
      msg,
      emoji,
      user,
      parentInterface: command.parentInterface
    })

    if (!Array.isArray(commandResults)) commandResults = [commandResults]

    const resultPromises = commandResults.map(async (commandResult) => {
      if (!commandResult) return

      const {
        content,
        embed,
        file,
        options = {}
      } = typeof commandResult === 'string' ? { content: commandResult } : commandResult

      let {
        channels = [msg.channel.id],
        awaits
      } = options

      if (!Array.isArray(channels)) channels = [channels]
      if (awaits && !Array.isArray(awaits)) awaits = [awaits]

      const responsePromises = channels.map((channel) => {
        const channelGuild = this._client.guilds.get(this._client.channelGuildMap[channel])
        const channelObject = channelGuild ? channelGuild.channels.get(channel) : undefined

        return this._sendResponse(channelObject, { content, embed, file }).then(this._successfulResponse.bind(this, { msg, user, command, parentInterface: command.parentInterface }, {
          ...options,
          channel,
          awaits
        }))
      })

      return Promise.all(responsePromises).then((responses) => {
        return {
          options: {
            ...options,
            channels,
            awaits
          },
          responses
        }
      })
    })

    return Promise.all(resultPromises).then((results) => {
      return {
        command,
        parentInterface: command.parentInterface,
        results
      }
    })
  }

  /**
   * Send a response to Discord
   * @private
   * @async
   * @param   {Eris.TextChannel}      channel             The ID of the channel to send the response to
   * @param   {Object}                msgData             The data for the response message
   * @prop    {String}                [msgData.content]   The response content
   * @prop    {Object}                [msgData.embed]     The response embed
   * @prop    {Object}                [msgData.file]      The response file
   * @prop    {String}                [msgData.file.name] The name of the file
   * @prop    {Buffer}                [msgData.file.file] The file content
   * @returns {Promise<Eris.Message>}                     The resulting response or a returned error of minor reasons why the response failed
   */
  async _sendResponse (channel, { content, embed, file }) {
    if (!channel) throw this._generateError('DiscordRESTError', 'Invalid Form Body\n  channel_id: Value "undefined" is not snowflake.', 50035, IgnoredError)

    if (content || embed || file) {
      if (file && !(file.file instanceof Buffer)) throw TypeError('Supplied file is not a Buffer instance:\n' + (file.file || file))

      return channel.createMessage({ content, embed }, file)
        .catch((err) => {
          if (err.code === 50035 && err.message.includes('length')) {
            return channel.createMessage('Text was too long, sent as a file instead.', {
              name: 'Command Result.txt',
              file: Buffer.from(`${content || 'undefined'}\n\n${inspect(embed)}`)
            })
          }

          throw err
        })
    }
  }

  /**
   * Tidy up after a successful response from a react command
   * @private
   * @async
   * @param   {Object}                data                   General data from the message, user, and react command
   * @prop    {Eris.Message}          data.msg               The message that was reacted on
   * @prop    {Eris.User}             data.user              The user that reacted
   * @prop    {ReactCommand}          data.command           The command that was triggered
   * @prop    {ReactInterface}        data.parentInterface   If the reaction was an interface button, the interface it was a part of
   * @param   {Object}                options                The options for the response
   * @prop    {String}                options.channel        The ID of the channel the response was sent to
   * @prop    {Await[]|Await}         options.awaits         An action or list of actions that are awaited after the results are processed
   * @prop    {ReactInterface}        options.reactInterface A react interface that is bound to the resulting message
   * @prop    {Number}                options.deleteAfter    How long until the response is deleted
   * @prop    {Eris.Message|Error}    response               The response that was sent to Discord
   * @returns {Promise<Eris.Message>}                        Overall results from the react command
   */
  async _successfulResponse ({ msg, user, command, parentInterface }, options, response) {
    const {
      channel,
      awaits,
      reactInterface,
      deleteAfter
    } = options

    if (awaits) {
      if (this._agent._commandHandler) this._agent._commandHandler.addAwaits(awaits, { _fallBackChannel: channel, _fallBackUser: user.id, _triggerResponse: response })
      else throw Error('The command handler isn\'t enabled; enable it by passing an empty array to Agent.handlerData.commands')
    }

    if (reactInterface) await this.bindInterface(response, reactInterface)

    if (deleteAfter) {
      if (!response || response instanceof Error) throw Error('Cannot delete a non-existent response with a delay of:\n' + deleteAfter)

      if (typeof deleteAfter !== 'number') throw TypeError('Supplied deleteAfter delay is not a number:\n' + deleteAfter)

      setTimeout(() => response.delete().catch((ignore) => ignore), deleteAfter)
    }

    if (command.options.removeReaction) msg.removeReaction(command.emoji, user.id).catch((ignore) => ignore)

    if (parentInterface && parentInterface.options.deleteAfterUse) this.detachInterface(msg)

    return response
  }

  /**
   * Bind an interface to a command
   * @async
   * @param   {Eris.Message}    msg            The message to bind to
   * @param   {ReactInterface}  reactInterface The interface to bind
   * @returns {Promise<Object>}                he resulting interface data
   */
  async bindInterface (msg, reactInterface) {
    if (!msg || msg instanceof Error) throw Error('Cannot attach an interface to a non-existent message or response.')
    if (!(reactInterface instanceof ReactInterface)) throw TypeError('Supplied react interface is not a ReactInterface instance:\n' + reactInterface)

    if (this._reactInterfaces.size > this._options.maxInterfaces) {
      const deleteAmount = parseInt(this._options.maxInterfaces / 3)

      const keys = this._reactInterfaces.keys()

      for (let i = 0; i < deleteAmount; i++) this._reactInterfaces.delete(keys.next().value)
    }

    this._reactInterfaces.set(msg.id, reactInterface)

    const buttons = reactInterface.buttons.values()
    for (const { emoji } of buttons) await msg.addReaction(emoji)

    return reactInterface
  }

  /**
   * @async
   * @param   {Eris.Message}            msg The message to detach the interface from
   * @returns {Promise<ReactInterface>}     The detached interface
   */
  async detachInterface (msg) {
    const reactInterface = this._reactInterfaces.get(msg.id)

    if (!reactInterface) return

    const buttons = reactInterface.buttons.values()

    for (const button of buttons) await msg.removeReaction(button.emoji).catch((ignore) => ignore)

    this._reactInterfaces.delete(msg.id)

    return reactInterface
  }

  /**
   * Get a bound interface of a message
   * @private
   * @param   {Eris.Message}             msg   The message
   * @param   {Object}                   emoji The emoji reacted with
   * @returns {ReactInterface|undefined}       The bound interface
   */
  _getInterface (msg, emoji) {
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
   * Generate an error Eris would throw
   * @private
   * @param   {String} name         The name of the error
   * @param   {String} message      The error message
   * @param   {String} code         The error code
   * @param   {Error}  [Type=Error] The error constructor class
   * @returns {Error}               The resulting error
   */
  _generateError (name, message, code, Type = Error) {
    const err = new Type(`${name} [${code}]: ${message}`)

    err.code = code
    err.name = name

    return err
  }

  /**
   * Load reaction commands
   * @param {ReactCommand[]|ReactCommand} reactCommands The reaction command(s) to load
   */
  loadReactCommands (reactCommands) {
    if (Array.isArray(reactCommands)) {
      for (const reactCommand of reactCommands) this._loadReactCommand(reactCommand)
    } else this._loadReactCommand(reactCommands)
  }

  /**
   * Load a reaction command
   * @param {ReactCommand} reactCommand The reaction command to load
   */
  _loadReactCommand (reactCommand) {
    if (!(reactCommand instanceof ReactCommand)) throw TypeError('Supplied react command not a ReactCommand instance:\n' + reactCommand)

    this._reactCommands.set(reactCommand.emoji, reactCommand)
  }
}

module.exports = ReactionHandler

/**
 * Object returned by a handled react command
 * @typedef {Object}                    ReactionHandlerResults
 * @prop    {Command}                   ReactionHandlerResults.command                        The command that was triggered
 * @prop    {ReactInterface}            ReactionHandlerResults.parentInterface                If the command was an interface button, the interface it was a part of
 * @prop    {Object[]}                  ReactionHandlerResults.results                        The results of every message sent
 * @prop    {Object}                    ReactionHandlerResults.results.options                Additional options resulting from the react command
 * @prop    {String[]}                  ReactionHandlerResults.results.options.channels       The ID of the channel the response was sent to
 * @prop    {Await[]}                   ReactionHandlerResults.results.options.awaits         A list of actions that are awaited after the results are processed
 * @prop    {ReactInterface}            ReactionHandlerResults.results.options.reactInterface A react interface that is bound to the resulting message
 * @prop    {Number}                    ReactionHandlerResults.results.options.deleteAfter    How long until the response is deleted
 * @prop    {Array<Eris.Message|Error>} ReactionHandlerResults.results.responses              The resulting responses of the command or returned errors of reasons why the response failed
 */
