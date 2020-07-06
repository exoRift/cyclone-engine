const BaseHandler = require('../base-handler/')

const {
  ReactCommand,
  ReactInterface
} = require('../../structures/')

/**
 * The module that handles incoming reactions
 */
class ReactionHandler extends BaseHandler {
  /**
   * Construct a reaction handler
   * @class
   * @param {Object}                      data                              The reaction handler data
   * @prop  {Agent}                       [data.agent]                      The agent managing the bot
   * @prop  {Eris.Client}                 data.client                       The Eris client
   * @prop  {ReactCommand[]|ReactCommand} [data.reactCommands=[]]           Array of reaction commands to load initially
   * @prop  {Object}                      [data.options={}]                 Options for the reaction handler
   * @prop  {Number}                      [data.options.maxInterfaces=1500] The maximum amount of interfaces cached before they start getting deleted
   * @prop  {Object}                      [data.options._app]               The Discord bot app info (If not supplied, the app is gotten automatically)
   */
  constructor ({ agent, client, reactCommands = [], options = {} }) {
    super({ agent, client, options })

    const {
      maxInterfaces = 1500
    } = options

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
   * Bind an interface to a command
   * @async
   * @param   {Eris.Message}            msg                The message to bind to
   * @param   {ReactInterface}          reactInterface     The interface to bind
   * @param   {String}                  _defaultDesignated The default designated user (generally the command initiator)
   * @returns {Promise<ReactInterface>}                    The resulting interface data
   */
  async bindInterface (msg, reactInterface, _defaultDesignated) {
    if (!msg || msg instanceof Error) throw Error('Cannot attach an interface to a non-existent message or response.')
    if (!(reactInterface instanceof ReactInterface)) throw TypeError('Supplied react interface is not a ReactInterface instance:\n' + reactInterface)

    if (!reactInterface.options.designatedUsers) reactInterface.options.designatedUsers = [_defaultDesignated]

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
   * @param   {Eris.Message}            msg                  The message to detach the interface from
   * @param   {Boolean}                 [removeButtons=true] Whether the buttons from the message are removed
   * @returns {Promise<ReactInterface>}                      The detached interface
   */
  async detachInterface (msg, removeButtons = true) {
    const reactInterface = this._reactInterfaces.get(msg.id)

    if (!reactInterface) return

    if (removeButtons) {
      const buttons = reactInterface.buttons.keys()

      for (const button of buttons) await msg.removeReaction(button).catch((ignore) => ignore)
    }

    this._reactInterfaces.delete(msg.id)

    return reactInterface
  }

  /**
   * Get a bound interface button of a message
   * @private
   * @param   {Eris.Message}             msg   The message
   * @param   {Object}                   emoji The emoji reacted with
   * @returns {ReactInterface|undefined}       The bound interface button
   */
  _getInterfaceButton (msg, emoji) {
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
   * Get a react command
   * @param   {String}                 emoji The emoji that triggers the react command
   * @returns {ReactCommand|undefined}       The found react command
   */
  getReactCommand (emoji) {
    return this._reactCommands.get(emoji)
  }

  /**
   * Handle an incoming Discord reaction
   * @async
   * @param   {Eris.Message}                       msg   The message reacted on
   * @param   {Object}                             emoji The data of the emoji reacted with
   * @param   {Eris.User}                          user  The user who reacted
   * @returns {Promise<ReactionHandlerResultList>}       The overall results of the react command
   */
  async handle (msg, emoji, user) {
    if (!msg.content && !msg.embeds) return /* Uncached */

    // Get command
    const command = await this._getInterfaceButton(msg, emoji) || this.getReactCommand(emoji.name)

    if (!command) return

    // Basic command options checking
    if (command.options.restricted && this._app && user.id !== this._app.owner.id) return
    if (command.options._designatedUsers && !command.options._designatedUsers.includes(user.id)) return
    if (command.options.guildOnly && msg.channel.type) return
    if (typeof command.action !== 'function') throw TypeError('React command action is not a function:\n' + command.emoji)

    // Run agent middleware (permissions)
    if (this._agent && this._agent._middleware) {
      for (const subroutine of this._agent._middleware) await subroutine(msg, msg.channel.guild.members.get(user.id), command)
    }

    // Run command
    let commandResults = await command.action({
      agent: this._agent,
      msg,
      emoji,
      user,
      parentInterface: command.parentInterface
    })

    if (!Array.isArray(commandResults)) commandResults = [commandResults]

    // Process results and send responses
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
   * Load a reaction command
   * @param {ReactCommand} reactCommand The reaction command to load
   */
  _loadReactCommand (reactCommand) {
    if (!(reactCommand instanceof ReactCommand)) throw TypeError('Supplied react command not a ReactCommand instance:\n' + reactCommand)

    this._reactCommands.set(reactCommand.emoji, reactCommand)
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
      if (this._agent && this._agent.commandHandler) this._agent.commandHandler.addAwaits(awaits, { _fallBackChannel: channel, _fallBackUser: user.id, _triggerResponse: response })
      else throw Error('The command handler isn\'t enabled; enable it by passing an empty array to Agent.handlerData.commands')
    }

    if (reactInterface) await this.bindInterface(response, reactInterface, user.id)

    if (deleteAfter) {
      if (!response || response instanceof Error) throw Error('Cannot delete a non-existent response with a delay of:\n' + deleteAfter)

      if (typeof deleteAfter !== 'number') throw TypeError('Supplied deleteAfter delay is not a number:\n' + deleteAfter)

      setTimeout(() => response.delete().catch((ignore) => ignore), deleteAfter)
    }

    if (command.options.removeReaction) msg.removeReaction(command.emoji, user.id).catch((ignore) => ignore)

    if (parentInterface && parentInterface.options.deleteAfterUse) this.detachInterface(msg)

    return response
  }
}

module.exports = ReactionHandler

/**
 * Result of a handled react command
 * @typedef {Object}         ReactionHandlerResult
 * @prop    {Object}         ReactionHandlerResult.options                Additional options resulting from the react command
 * @prop    {String[]}       ReactionHandlerResult.options.channels       The ID of the channel the response was sent to
 * @prop    {Await[]}        ReactionHandlerResult.options.awaits         A list of actions that are awaited after the results are processed
 * @prop    {ReactInterface} ReactionHandlerResult.options.reactInterface A react interface that is bound to the resulting message
 * @prop    {Number}         ReactionHandlerResult.options.deleteAfter    How long until the response is deleted
 * @prop    {Eris.Message[]} ReactionHandlerResult.responses              The resulting responses of the react command
 */

/**
 * Object returned by the handle method
 * @typedef {Object}                  ReactionHandlerResultList
 * @prop    {Command}                 ReactionHandlerResultList.command         The command that was triggered
 * @prop    {ReactInterface}          ReactionHandlerResultList.parentInterface If the command was an interface button, the interface it was a part of
 * @prop    {ReactionHandlerResult[]} ReactionHandlerResultList.results         The results of every message sent
 */
