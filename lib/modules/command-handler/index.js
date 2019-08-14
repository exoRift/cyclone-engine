const { inspect } = require('util')
const InputError = require('./input-error.js')

const Command = require('../command')
const Await = require('../await')
const Replacer = require('../replacer')

const channelTypes = [0, 1, 3]

/**
 * The module that handles incoming commands.
 */
class CommandHandler {
  /**
   * Create a CommandHandler
   * @class
   * @param {Object}              data                                    The command handler data.
   * @prop  {Agent}               [data.agent={}]                         The agent managing the bot.
   * @prop  {String}              [data.prefix='!']                       The prefix of commands.
   * @prop  {Eris.Client}         data.client                             The Eris client.
   * @prop  {String}              data.ownerID                            The ID of the bot owner.
   * @prop  {QueryBuilder}        [data.knex]                             The simple-knex query builder.
   * @prop  {Command[]|Command}   [data.commands=[]]                      Array of commands to load initially.
   * @prop  {Replacer[]|Replacer} [data.replacers=[]]                     Array of the message content replacers to load initially.
   * @prop  {Object}              [data.options={}]                       Additional options for the command handler.
   * @prop  {Object}              [data.options.replacerBraces={}]        The braces that invoke a replacer.
   * @prop  {String}              [data.options.replacerBraces.open='|']  The opening brace.
   * @prop  {String}              [data.options.replacerBraces.close='|'] The closing brace.
   * @prop  {Number[]}            [data.options.ignoreCodes=[]]           The Discord error codes to ignore.
   */
  constructor ({ agent = {}, prefix = '!', client, ownerID, knex, commands = [], replacers = [], options = {} }) {
    const {
      replacerBraces: {
        open = '|',
        close = '|'
      } = {},
      ignoreCodes = []
    } = options

    if (replacers.length && open.startsWith(prefix)) console.log('WARNING: Your replacer opening brace starts with your prefix. This could lead to some issues.')

    /**
     * The agent managing the bot.
     * @private
     * @type    {Agent}
     */
    this._agent = agent

    /**
     * The prefix of commands.
     * @private
     * @type    {String}
     */
    this._prefix = prefix

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
     * Map of the commands.
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
     * Map of the message content replacers.
     * @private
     * @type    {Map<String, Replacer>}
     */
    this._replacers = new Map()

    /**
     * The braces that invoke a replacer.
     * @private
     * @type    {Object}
     */
    this._replacerBraces = {
      open,
      close
    }

    /**
     * The Discord error codes to ignore.
     * @private
     * @type    {Number[]}
     */
    this._ignoreCodes = ignoreCodes

    /**
     * An object containing message data used to wait for a user's response.
     * @private
     * @type    {Map<String, AwaitData>}
     */
    this._awaits = new Map()

    this.loadCommands(commands)
    this.loadReplacers(replacers)
  }

  /**
   * Handle an incoming Discord messages.
   * @async
   * @param   {Eris.Message}                   msg The Discord message.
   * @returns {Promise<CommandHandlerResults>}     The results of the command.
   */
  async handle (msg) {
    let text = this._runReplacers(msg.content)

    const awaited = await this._getAwait(msg)

    if (!awaited) {
      text = this._replaceMentionWithPrefix(text)
      if (!text.startsWith(this._prefix)) return
      text = text.substring(this._prefix.length)
    }

    let args = text.split(' ')
    let keyword
    if (!awaited) keyword = args.shift().toLowerCase()
    const command = awaited || this._commands.get(keyword) || this._commands.get(this._aliases.get(keyword))

    if (!command) return
    if (command.restricted && msg.author.id !== this._ownerID) throw new InputError('This command is either temporarily disabled, or restricted.', 'Check the bot\'s announcement feed', 'restricted')

    args = this._parseArgs(command, args.join(' '))
    if (command.args && (!args || args.length < command.args.filter((a) => a.mand).length)) throw new InputError('Invalid arguments:', 'Reference the help menu.', 'arguments')

    if (typeof command.action !== 'function') throw TypeError('Command action is not a function:\n' + (command instanceof Await ? 'awaitID: ' + command._id : command.name))

    let userData
    if (command.dbTable) userData = await this._handleDBRequest(command.dbTable, msg.author.id)

    let commandResults = await command.action({
      agent: this._agent,
      client: this._client,
      commands: this._commands,
      replacers: this._replacers,
      msg,
      args,
      userData,
      knex: this._knex,
      initResponse: command.initResponse
    })

    if (!(commandResults instanceof Array)) commandResults = [commandResults]

    const results = commandResults.map(async (commandResult) => {
      if (!commandResult) return

      const {
        content,
        embed,
        file,
        options = {}
      } = typeof commandResult === 'string' ? { content: commandResult } : commandResult

      const {
        channel = msg.channel.id
      } = options

      const channelGuild = this._client.guilds.get(this._client.channelGuildMap[channel])
      const channelObject = channelGuild ? channelGuild.channels.get(channel) : undefined

      const response = await this._sendResponse(channelObject, { content, embed, file })

      return {
        options: {
          ...options,
          channel
        },
        response
      }
    })

    return Promise.all(results).then(this._successfulResponses.bind(this, { msg, command }))
  }

  /**
   * Send a response to Discord.
   * @private
   * @async
   * @param   {Eris.TextChannel}                        channel             The channel to send the response to.
   * @param   {Object}                                  msgData             The data for the response message.
   * @prop    {String}                                  [msgData.content]   The response content.
   * @prop    {Object}                                  [msgData.embed]     The response embed.
   * @prop    {Object}                                  [msgData.file]      The response file.
   * @prop    {String}                                  [msgData.file.name] The name of the file.
   * @prop    {Buffer}                                  [msgData.file.file] The file content.
   * @returns {Promise<Eris.Message>|Error<MinorError>}                     The resulting response or a returned error of minor reasons why the response failed.
   */
  async _sendResponse (channel, { content, embed, file }) {
    if (!channel) return Error('invalidChannel')
    if (!channel.permissionsOf(this._client.user.id).has('sendMessages')) return Error('channelPermissions')
    if (!channelTypes.includes(channel.type)) return Error('channelType')

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

          if (this._ignoreCodes.includes(err.code)) return Error('ignoredError')

          throw err
        })
    }
  }

  /**
   * Tidy up after a successful response from a command.
   * @private
   * @async
   * @param   {Object}                         data                           General data from the message and command.
   * @prop    {Eris.Message}                   data.msg                       The message that executed the command.
   * @prop    {ReactCommand}                   data.command                   The command that was triggered.
   * @param   {Object[]}                       results                        The results of every message sent.
   * @prop    {Object}                         results.options                The resulting data/options of a message sent.
   * @prop    {Await}                          results.options.wait           An action that is awaited after the results are processed.
   * @prop    {ReactInterface}                 results.options.reactInterface A react interface that is bound to the resulting message.
   * @prop    {Number}                         results.options.deleteAfter    How long until the response is deleted.
   * @prop    {Eris.Message|Error<MinorError>} results.response               The response that was sent to Discord.
   * @returns {Promise<CommandHandlerResults>}                                Overall results from the command.
   */
  async _successfulResponses ({ msg, command }, results) {
    for (const result of results) {
      if (!result) continue

      const {
        options,
        response
      } = result
      const {
        wait,
        reactInterface,
        deleteAfter
      } = options

      if (wait) await this._addAwait({ channel: msg.channel.id, user: msg.author.id, initResponse: response, wait })

      if (reactInterface) {
        if (this._agent._reactionHandler) await this._agent._reactionHandler.bindInterface(response, reactInterface)
        else throw Error('The reaction handler isn\'t enabled; enable it by passing an empty array to Agent.reactCommands.')
      }

      if (deleteAfter) {
        if (!response || response instanceof Error) throw Error('Cannot delete a non-existent response with a delay of:\n' + deleteAfter)

        if (typeof deleteAfter !== 'number') throw TypeError('Supplied deleteAfter delay is not a number:\n' + deleteAfter)

        setTimeout(() => response.delete(), deleteAfter)
      }
    }

    if (command instanceof Await) {
      if (command.refreshOnUse) command.refresh()
      else command.clear()
    }

    return { command, results }
  }

  /**
   * Load commands.
   * @param {Command[]|Command} commands The command(s) to load.
   */
  loadCommands (commands) {
    if (commands instanceof Array) {
      for (const command of commands) this._loadCommand(command)
    } else this._loadCommand(commands)
  }

  /**
   * Load replacers.
   * @param {Replacer[]|Replacer} replacers The replacer(s) to load.
   */
  loadReplacers (replacers) {
    if (replacers instanceof Array) {
      for (const replacer of replacers) this._loadReplacer(replacer)
    } else this._loadReplacer(replacers)
  }

  /**
   * Replace a mention of the bot with the prefix.
   * @private
   * @param   {String} content The content of the message.
   * @returns {String}         The new content.
   */
  _replaceMentionWithPrefix (content) {
    return content.replace(new RegExp(`^<@!?${this._client.user.id}> ?`), this._prefix)
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
    if (!this._knex) throw Error('QueryBuilder was not supplied to CommandHandler! Attempted to fetch table:\n' + table)

    await this._knex.insert({ table, data: { id } }).catch((ignore) => ignore)

    return this._knex.get({ table, where: { id } })
  }

  /**
   * Check message content for stuff to replace.
   * @private
   * @param   {String} content The message content to run the replacers against.
   * @returns {String}         The message content after replacement.
   */
  _runReplacers (content) {
    return content.replace(new RegExp(`\\${this._replacerBraces.open}(.+?)\\${this._replacerBraces.close}`, 'g'), (content, capture) => {
      let args = capture.split(' ')

      const keyword = args.shift()
      const replacer = this._replacers.get(keyword)

      if (replacer) {
        args = this._parseArgs(replacer, args.join(' '))

        if (replacer.args && (!args || args.length < replacer.args.filter((a) => a.mand).length)) return 'INVALID ARGS'

        return replacer.action({ content, capture, args })
      }
      return 'INVALID KEY'
    })
  }

  /**
   * Load a command.
   * @private
   * @param   {Command} command The command to load.
   */
  _loadCommand (command) {
    if (!(command instanceof Command)) throw TypeError('Supplied command not a Command instance:\n' + command)

    const lastArg = command.args[command.args.length - 1]

    if (lastArg && lastArg.delim) console.log(`Disclaimer: Your command: ${command.name}'s last argument unnecessarily has a delimiter.`)

    this._commands.set(command.name, command)

    for (const alias of command.aliases) this._aliases.set(alias, command.name)
  }

  /**
   * Load a replacer.
   * @private
   * @param   {Replacer} replacer The replacer to load.
   */
  _loadReplacer (replacer) {
    if (!(replacer instanceof Replacer)) throw TypeError('Supplied replacer not Replacer instance:\n' + replacer.name)

    this._replacers.set(replacer.key, replacer)
  }

  /**
   * Parse the arguments from a message.
   * @private
   * @param   {String}   command The name of the command.
   * @param   {String}   args    The arguments provided.
   * @returns {String[]}         The parsed arguments.
   */
  _parseArgs (command, args) {
    const chars = args.split('')
    const parsed = []

    for (let i = 0; i < command.args.length; i++) {
      const delim = command.args[i].delim || ' '

      for (let j = parsed.join('').length; j < chars.length; j++) {
        const ch = chars[j]

        if (ch === delim && i !== command.args.length - 1) {
          chars.splice(j, 1)

          break
        } else if (parsed[i]) parsed[i] += ch
        else parsed[i] = ch
      }

      if (command.args[i].type === 'number' && parsed[i] !== undefined) {
        const number = parseInt(parsed[i])

        if (number) parsed[i] = number
        else return
      }
    }

    return parsed
  }

  /**
   * Set an await.
   * @private
   * @async
   * @param   {Object}         data              The data for the await.
   * @prop    {String}         data.channel      The channel ID to listen for the message on.
   * @prop    {String}         data.user         The user ID to listen for.
   * @prop    {Eris.Message}   data.initResponse The last response to the command that created the await.
   * @prop    {Await}          data.wait         The command we are awaiting.
   * @returns {Promise<Await>}                   The await.
   */
  async _addAwait ({ channel, user, initResponse, wait }) {
    if (!(wait instanceof Await)) throw TypeError('Supplied wait is not an Await instance:\n' + wait)

    const id = (wait.channel || channel) + user

    this._awaits.set(id, wait)

    wait.startTimer({ id, awaitMap: this._awaits, initResponse })

    return wait
  }

  /**
   * Get an awaited message.
   * @private
   * @async
   * @param   {Eris.Message}             msg The message.
   * @returns {Promise<Await|Undefined>}     The await.
   */
  async _getAwait (msg) {
    const wait = this._awaits.get(msg.channel.id + msg.author.id)

    if (wait) {
      if (!wait.check({ msg, prefix: this._prefix })) {
        if (wait.oneTime) await wait.clear()

        return
      }

      return wait
    }
  }
}

module.exports = CommandHandler

/**
 * Object returned by a command.
 * @typedef {Object}                         CommandHandlerResults
 * @prop    {Command|Await}                  CommandHandlerResults.command                        The object of the command called.
 * @prop    {Object[]}                       CommandHandlerResults.results                        The results of every message sent.
 * @prop    {Object}                         CommandHandlerResults.results.options                Additional options resulting from the command.
 * @prop    {String}                         CommandHandlerResults.results.options.channel        The ID of the channel the response was sent to.
 * @prop    {Await}                          CommandHandlerResults.results.options.wait           An action that is awaited after the results are processed.
 * @prop    {ReactInterface}                 CommandHandlerResults.results.options.reactInterface A react interface that is bound to the resulting message.
 * @prop    {Number}                         CommandHandlerResults.results.options.deleteAfter    How long until the response is deleted.
 * @prop    {Eris.Message|Error<MinorError>} CommandHandlerResults.results.response               The resulting response of the command or a returned error of minor reasons why the response failed.
 */
