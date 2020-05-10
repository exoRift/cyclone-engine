const {
  inspect
} = require('util')
const {
  IgnoredError
} = require('../../errors/')

const {
  Await
} = require('../../structures/')

/**
 * A foundation to create a handler, supplying needed/common utilities
 */
class Handler {
  /**
   * Create a Handler
   * @class
   * @param {Object}      data           The handler data
   * @prop  {Agent}       [agent={}]     The agent managing the bot
   * @prop  {Eris.Client} client         The Eris client
   */
  constructor ({ agent = {}, client }) {
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

    this._getOwnerID()
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
   * Fetches the ID of the owner of the bot and defines it as a member
   * @private
   * @returns {Promise}
   */
  _getOwnerID () {
    return this._client.getOAuthApplication().then((app) => {
      /**
       * The ID of the owner of the bot
       * @private
       * @type    {String}
       */
      this._ownerID = app.owner.id
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

    if (reactInterface) {
      if (this._agent._reactionHandler) await this._agent._reactionHandler.bindInterface(response, reactInterface)
      else throw Error('The reaction handler isn\'t enabled; enable it by passing an empty array to Agent.handlerData.reactCommands')
    }

    if (deleteAfter) {
      if (!response || response instanceof Error) throw Error('Cannot delete a non-existent response with a delay of:\n' + deleteAfter)

      if (typeof deleteAfter !== 'number') throw TypeError('Supplied deleteAfter delay is not a number:\n' + deleteAfter)

      setTimeout(() => response.delete().catch((ignore) => ignore), deleteAfter)
    }

    if (command instanceof Await) { // command handler
      if (command.options.refreshOnUse) command.refresh()
      else command.clear()
    }

    if (command.options.removeReaction) msg.removeReaction(command.emoji, user.id).catch((ignore) => ignore) // reaction handler

    if (parentInterface && parentInterface.options.deleteAfterUse) this.agent._reactionHandler.detachInterface(msg) // reaction handler

    return response
  }
}

module.exports = Handler
