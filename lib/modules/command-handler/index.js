const {
  inspect
} = require('util')
const {
  InputError,
  IgnoredError
} = require('../../errors/')

const {
  Command,
  Await,
  Replacer
} = require('../../structures/')

/**
 * The module that handles incoming commands
 */
class CommandHandler {
  /**
   * Create a CommandHandler
   * @class
   * @param {Object}              data                                    The command handler data
   * @prop  {Agent}               [data.agent={}]                         The agent managing the bot
   * @prop  {Eris.Client}         data.client                             The Eris client
   * @prop  {String}              data.ownerID                            The ID of the bot owner
   * @prop  {Command[]|Command}   [data.commands=[]]                      Array of commands to load initially
   * @prop  {Replacer[]|Replacer} [data.replacers=[]]                     Array of the message content replacers to load initially
   * @prop  {Object}              [data.options={}]                       Additional options for the command handler
   * @prop  {String}              [data.options.prefix='!']               The prefix of commands
   * @prop  {Object}              [data.options.replacerBraces={}]        The braces that invoke a replacer
   * @prop  {String}              [data.options.replacerBraces.open='|']  The opening brace
   * @prop  {String}              [data.options.replacerBraces.close='|'] The closing brace
   */
  constructor ({ agent = {}, client, ownerID, commands, replacers, options = {} }) {
    const {
      prefix = '!',
      replacerBraces: {
        open = '|',
        close = '|'
      } = {}
    } = options

    if (replacers && open.startsWith(prefix)) console.log('WARNING: Your replacer opening brace starts with your prefix. This could lead to some issues.')

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
     * Map of the commands
     * @private
     * @type    {Map<String, Command>}
     */
    this._commands = new Map()

    /**
     * Map of the command aliases
     * @private
     * @type    {Map<String, String>}
     */
    this._aliases = new Map()

    /**
     * Map of the message content replacers
     * @private
     * @type    {Map<String, Replacer>}
     */
    this._replacers = new Map()

    /**
     * An object containing message data used to wait for a user's response
     * @private
     * @type    {Map<String, AwaitData>}
     */
    this._awaits = new Map()

    /**
     * This options for the command handler
     * @private
     * @type    {Object}
     * @prop    {String}   prefix               The prefix to execute commands
     * @prop    {Object}   replacerBraces       The braces that invoke a replacer
     * @prop    {String}   replacerBraces.open  The opening brace
     * @prop    {String}   replacerBraces.close The closing brace
     */
    this._options = {
      prefix,
      replacerBraces: {
        open,
        close
      }
    }

    this.loadCommands(commands)
    this.loadReplacers(replacers)
  }

  /**
   * Handle an incoming Discord messages
   * @async
   * @param   {Eris.Message}                   msg The Discord message
   * @returns {Promise<CommandHandlerResults>}     The results of the command
   */
  async handle (msg) {
    let text = this._runReplacers(msg.content)

    const awaited = await this._getAwait({
      ...msg,
      content: text
    })

    if (!awaited) {
      text = this._replaceMentionWithPrefix(text)

      if (!text.startsWith(this._options.prefix)) return

      text = text.substring(this._options.prefix.length)
    }

    let args = text.split(' ')
    let keyword
    if (!awaited) keyword = args.shift().toLowerCase()
    const command = awaited || this._commands.get(keyword) || this._commands.get(this._aliases.get(keyword))

    if (!command) return
    if (command.options.restricted && msg.author.id !== this._ownerID) throw new InputError('This command is either temporarily disabled, or restricted', 'Check the bot\'s announcement feed', 'restricted')

    if (awaited && awaited.options.shiftCount) args = args.splice(awaited.options.shiftCount, args.length)

    args = this._parseArgs(command, args.join(' '))
    if (command.options.args && (!args || args.length < command.options.args.filter((a) => a.mand).length)) throw new InputError('Invalid arguments', 'Reference the help menu.', 'arguments')

    if (typeof command.action !== 'function') throw TypeError('Command action is not a function:\n' + (command instanceof Await ? 'awaitID: ' + command._id : command.name))

    let commandResults = await command.action({
      agent: this._agent,
      client: this._client,
      commands: this._commands,
      replacers: this._replacers,
      msg,
      args,
      triggerResponse: command.triggerResponse
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

        return this._sendResponse(channelObject, { content, embed, file }).then(this._successfulResponse.bind(this, { msg, command }, {
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
          if (err.code === 50035 && (err.message.includes('length') || err.message.includes('size'))) {
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
   * Tidy up after a successful response from a command
   * @private
   * @param   {Object}             data                   General data from the message and command
   * @prop    {Eris.Message}       data.msg               The message that executed the command
   * @prop    {ReactCommand}       data.command           The command that was triggered
   * @param   {Object}             options                The options for the response
   * @prop    {String}             options.channel        The ID of the channel the response was sent to
   * @prop    {Await[]|Await}      options.awaits         An action or list of actions that are awaited after the results are processed
   * @prop    {ReactInterface}     options.reactInterface A react interface that is bound to the resulting message
   * @prop    {Number}             options.deleteAfter    How long until the response is deleted
   * @param   {Eris.Message|Error} response               The response that was sent to Discord
   * @returns {Eris.Message}                              The response that was utilized
   */
  _successfulResponse ({ msg, command }, options, response) {
    const {
      channel,
      awaits,
      reactInterface,
      deleteAfter
    } = options

    if (awaits) this.addAwaits(awaits, { _fallBackChannel: channel, _fallBackUser: msg.author.id, _triggerResponse: response })

    if (reactInterface) {
      if (this._agent._reactionHandler) this._agent._reactionHandler.bindInterface(response, reactInterface)
      else throw Error('The reaction handler isn\'t enabled; enable it by passing an empty array to Agent.handlerData.reactCommands')
    }

    if (deleteAfter) {
      if (!response || response instanceof Error) throw Error('Cannot delete a non-existent response with a delay of:\n' + deleteAfter)

      if (typeof deleteAfter !== 'number') throw TypeError('Supplied deleteAfter delay is not a number:\n' + deleteAfter)

      setTimeout(() => response.delete().catch((ignore) => ignore), deleteAfter)
    }

    if (command instanceof Await) {
      if (command.options.refreshOnUse) command.refresh()
      else command.clear()
    }

    return response
  }

  /**
   * Load commands
   * @param {Command[]|Command} [commands=[]] The command(s) to load
   */
  loadCommands (commands = []) {
    if (Array.isArray(commands)) {
      for (const command of commands) this._loadCommand(command)
    } else this._loadCommand(commands)
  }

  /**
   * Load replacers
   * @param {Replacer[]|Replacer} [replacers=[]] The replacer(s) to load
   */
  loadReplacers (replacers = []) {
    if (Array.isArray(replacers)) {
      for (const replacer of replacers) this._loadReplacer(replacer)
    } else this._loadReplacer(replacers)
  }

  /**
   * Replace a mention of the bot with the prefix
   * @private
   * @param   {String} content The content of the message
   * @returns {String}         The new content
   */
  _replaceMentionWithPrefix (content) {
    return content.replace(new RegExp(`^<@!?${this._client.user.id}> ?`), this._options.prefix)
  }

  /**
   * Check message content for stuff to replace
   * @private
   * @param   {String} content The message content to run the replacers against
   * @returns {String}         The message content after replacement
   */
  _runReplacers (content) {
    return content.replace(new RegExp(`\\${this._options.replacerBraces.open}(.+?)\\${this._options.replacerBraces.close}`, 'g'), (content, capture) => {
      let args = capture.split(' ')

      const keyword = args.shift()
      const replacer = this._replacers.get(keyword)

      if (replacer) {
        args = this._parseArgs(replacer, args.join(' '))

        if (replacer.options.args && (!args || args.length < replacer.options.args.filter((a) => a.mand).length)) return 'INVALID ARGS'

        return replacer.action({ content, capture, args })
      }
      return 'INVALID KEY'
    })
  }

  /**
   * Load a command
   * @private
   * @param   {Command} command The command to load
   */
  _loadCommand (command) {
    if (!(command instanceof Command)) throw TypeError('Supplied command not a Command instance:\n' + command)

    const lastArg = command.options.args[command.options.args.length - 1]

    if (lastArg && lastArg.delim) console.log(`Disclaimer: Your command: ${command.name}'s last argument unnecessarily has a delimiter.`)

    this._commands.set(command.name, command)

    for (const alias of command.options.aliases) this._aliases.set(alias, command.name)
  }

  /**
   * Load a replacer
   * @private
   * @param   {Replacer} replacer The replacer to load
   */
  _loadReplacer (replacer) {
    if (!(replacer instanceof Replacer)) throw TypeError('Supplied replacer not Replacer instance:\n' + replacer.name)

    this._replacers.set(replacer.key, replacer)
  }

  /**
   * Parse the arguments from a message
   * @private
   * @param   {String}   command The name of the command
   * @param   {String}   args    The arguments provided
   * @returns {String[]}         The parsed arguments
   */
  _parseArgs (command, chars) {
    const parsed = []

    for (let a = 0; a < command.options.args.length; a++) {
      const delim = command.options.args[a].delim || ' '

      for (let ch = parsed.join('').length; ch < chars.length; ch++) {
        const char = chars[ch]

        if (char === delim[0] && chars.substring(ch, chars.length).startsWith(delim.substring(1, delim.length)) && a !== command.options.args.length - 1) {
          chars = chars.substring(0, ch) + chars.substring(ch + delim.length)

          break
        } else if (parsed[a]) parsed[a] += char
        else parsed[a] = char
      }

      if (command.options.args[a].type === 'number' && parsed[a] !== undefined) {
        const number = parseInt(parsed[a])

        if (number) parsed[a] = number
        else return
      }
    }

    return parsed
  }

  /**
   * Set an await
   * @param   {Await[]|Await}    awaits                     The command or a list of commands to await
   * @param   {Object}           [options={}]               The data for the awaits
   * @prop    {String}           [options._fallBackChannel] The channel ID to listen for the message on if its not defined in the Await object
   * @prop    {String}           [options._fallBackUser]    The user ID to listen for if its not defined in the Await object
   * @prop    {Eris.Message}     [options._triggerResponse] The response to the command that created the awaits
   * @returns {Await[]}                                     The submitted awaits
   */
  addAwaits (awaits, { _fallBackChannel, _fallBackUser, _triggerResponse } = {}) {
    if (!Array.isArray(awaits)) awaits = [awaits]

    for (const wait of awaits) {
      if (!(wait instanceof Await)) throw TypeError('Supplied await is not an Await instance:\n' + wait)

      if (!wait.options.channel) {
        if (!_fallBackChannel) throw Error('An await didn\'t have a defined channel or fallback channel. This can be caused by directly calling CommandHandler.addAwaits')

        wait.options.channel = _fallBackChannel
      }
      if (!wait.options.user) {
        if (!_fallBackChannel) throw Error('An await didn\'t have a defined user or fallback user. This can be caused by directly calling CommandHandler.addAwaits')

        wait.options.user = _fallBackUser
      }

      const id = wait.options.channel + wait.options.user

      this._awaits.set(id, wait)

      wait.startTimer({ id, awaitMap: this._awaits, triggerResponse: _triggerResponse })
    }

    return awaits
  }

  /**
   * Get an awaited message
   * @private
   * @param   {Eris.Message}    msg The message
   * @returns {Await|undefined}     The await
   */
  _getAwait (msg) {
    const wait = this._awaits.get(msg.channel.id + msg.author.id)

    if (wait) {
      if (wait.options.requirePrefix) {
        const text = this._replaceMentionWithPrefix(msg.content)

        if (!text.startsWith(this._options.prefix)) return

        msg.content = text.substring(this._options.prefix.length)
      }

      if (!wait.options.check(msg)) {
        if (wait.options.oneTime) wait.clear()

        return
      }

      return wait
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
}

module.exports = CommandHandler

/**
 * Object returned by a handled command
 * @typedef {Object}                    CommandHandlerResults
 * @prop    {Command|Await}             CommandHandlerResults.command                        The object of the command called
 * @prop    {Object[]}                  CommandHandlerResults.results                        The results of every message sent
 * @prop    {Object}                    CommandHandlerResults.results.options                Additional options resulting from the command
 * @prop    {String[]}                  CommandHandlerResults.results.options.channels       The IDs of the channels the responses were sent to
 * @prop    {Await[]}                   CommandHandlerResults.results.options.awaits         A list of actions that are awaited after the results are processed
 * @prop    {ReactInterface}            CommandHandlerResults.results.options.reactInterface A react interface that is bound to the resulting message
 * @prop    {Number}                    CommandHandlerResults.results.options.deleteAfter    How long until the response is deleted
 * @prop    {Array<Eris.Message|Error>} CommandHandlerResults.results.responses              The resulting responses of the command or returned errors of reasons why the response failed
 */
