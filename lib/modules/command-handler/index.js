const { inspect } = require('util')

const Command = require('../command')
const Await = require('../await')
const Replacer = require('../replacer')
const ReactInterface = require('../react-interface')

/**
 * A class reprsenting the command handler.
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
      ignoreCodes
    } = options
    if (open.startsWith(prefix)) console.log('WARNING: Your replacer opening brace starts with your prefix. This could lead to some issues.')

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
     * Map of commands.
     * @private
     * @type    {Map<String, Command>}
     */
    this._commands = new Map()

    /**
     * Map of the message content replacers .
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
   * @param   {Eris.Message}            msg The Discord message.
   * @returns {Promise<CommandResults>}     The results of the command.
   */
  async handle (msg) {
    let text = this._runReplacers(msg.content)

    let awaited = this._awaits.get(msg.channel.id + msg.author.id)
    if (awaited) {
      if (!awaited.check({ msg, prefix: this._prefix })) {
        if (awaited.oneTime) awaited.clear()
        awaited = undefined
      }
    }
    if (!awaited) {
      text = this._replaceMentionWithPrefix(text)
      if (!text.startsWith(this._prefix)) return
      text = text.substring(this._prefix.length)
    }

    let args = text.split(' ')
    let keyword
    if (!awaited) keyword = args.shift()
    const command = awaited || this._commands.get(keyword)

    if (!command) return
    if (command.restricted && msg.author.id !== this._ownerID) return '```\nThis command is either temporarily disabled, or restricted.```'

    args = this._sanitizeArgs(command, args)
    if (command.args && (!args || args.length < command.args.filter((a) => a.mand).length)) return '```\nInvalid arguments. Reference the help menu.```'

    let dbData
    if (command.dbTable) dbData = await this._handleDBRequest(command.dbTable, msg.author.id)

    const result = await command.action({
      agent: this._agent,
      client: this._client,
      commands: this._commands,
      replacers: this._replacers,
      msg,
      args,
      userData: dbData,
      knex: this._knex,
      lastResponse: command.lastResponse
    })

    const {
      content,
      embed,
      file,
      options: {
        wait,
        reactInterface,
        deleteAfter
      } = {}
    } = typeof result === 'string' ? { content: result } : result || {}

    const _successfulResponse = (rsp) => {
      let awaitedCopy
      if (awaited) {
        awaitedCopy = {
          ...awaited,
          name: 'triggeredAwait'
        }
        if (awaited.refreshOnUse) awaited.refresh()
        else awaited.clear()
      }

      if (wait) {
        if (!(wait instanceof Await)) throw TypeError('Supplied wait is not an Await instance:\n' + wait)
        this._addAwait({ channel: msg.channel.id, user: msg.author.id, rsp, wait })
      }

      if (reactInterface) {
        if (!(reactInterface instanceof ReactInterface)) throw TypeError('Supplied react interface is not a ReactInterface instance:\n' + reactInterface.buttons)
        if (this._agent._reactionHandler) this._agent._reactionHandler.bindInterface(rsp, reactInterface)
        else throw Error('The reaction handler isn\'t enabled; enable it by passing an empty array to reactCommands.')
      }

      if (deleteAfter && deleteAfter instanceof Number) setTimeout(() => rsp.delete(), deleteAfter)

      return { command: awaitedCopy || command, content, embed, file, wait, reactInterface, rsp }
    }

    if (!result || (!msg.channel.type && !msg.channel.permissionsOf(this._client.user.id).has('sendMessages'))) return _successfulResponse()

    if (content || embed || file) {
      if (file && !(file instanceof Buffer)) throw TypeError('Supplied file is not a Buffer instance:\n' + file)
      return msg.channel.createMessage({ content, embed }, file)
        .catch((err) => {
          if (err.code === 50035 && (err.message.includes('length') || err.message.includes('size'))) {
            return msg.channel.createMessage('Text was too long, sent as a file instead.', {
              name: 'Command Result.txt',
              file: Buffer.from(`${content || 'undefined'}\n\n${inspect(embed)}`)
            }).then(_successfulResponse)
          }
          if (this._ignoreCodes.includes(err.code)) return _successfulResponse()
          throw err
        })
        .then(_successfulResponse)
    }
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
   * @param   {String} table    The name of the table.
   * @param   {String} id       The ID of the user
   * @returns {Promise<Object>} The user's data.
   */
  async _handleDBRequest (table, id) {
    if (!this._knex) throw Error('QueryBuilder was not supplied to CommandHandler!')
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
        args = this._sanitizeArgs(replacer, args)
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
    if (!(command instanceof Command)) throw TypeError('Supplied command not Command instance:\n' + command.name)
    const lastArg = command.args[command.args.length - 1]
    if (lastArg && lastArg.delim) console.log(`Disclaimer: Your command: ${command.name}'s last argument unnecessarily has a delimiter.`)
    this._commands.set(command.name, command)
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
   * @param   {String[]} args    The arguments provided.
   * @returns {String[]}         The parsed arguments.
   */
  _sanitizeArgs (command, args) {
    const chars = args.join(' ').split('')
    const cleaned = []
    for (let i = 0; i < command.args.length; i++) {
      const delim = command.args[i].delim || ' '
      for (let j = cleaned.join(' ').length; j < chars.length; j++) {
        const ch = chars[j]
        if (ch === delim && i !== command.args.length - 1) {
          if (delim === ' ') chars.splice(j, 1)
          break
        } else if (cleaned[i]) cleaned[i] += ch
        else cleaned[i] = ch
      }
    }
    return cleaned
  }

  /**
   * Set an await.
   * @private
   * @async
   * @param   {Object}           data         The data for the await.
   * @prop    {String}           data.channel The channel ID to listen for the message on.
   * @prop    {String}           data.user    The user ID to listen for.
   * @prop    {Eris.Message}     data.rsp     The last response to the command that created the await.
   * @prop    {Promise<Await>}   data.wait    The command we are awaiting.
   */
  async _addAwait ({ channel, user, rsp, wait }) {
    const id = (wait.channel || channel) + user
    let timer = setTimeout(() => this._awaits.delete(id), wait.timeout)
    this._awaits.set(id, {
      id,
      lastResponse: rsp,
      ...wait,
      timestamp: Date.now(),
      timer,
      clear: () => {
        clearTimeout(timer)
        this._awaits.delete(id)
      },
      refresh: () => {
        clearTimeout(timer)
        timer = setTimeout(() => this._awaits.delete(id), wait.timeout)
      }
    })
  }
}

module.exports = CommandHandler

/**
 * Object returned by a command.
 * @typedef {Object}         CommandResults
 * @prop    {Command}        CommandResults.command        The object of the command called.
 * @prop    {String}         CommandResults.content        The resulting message content sent by the bot.
 * @prop    {Eris.Embed}     CommandResults.embed          The resulting embed sent by the bot.
 * @prop    {Buffer}         CommandResults.file           The resulting file sent by the bot.
 * @prop    {Await}          CommandResults.wait           An action that is awaited after the results are processed.
 * @prop    {ReactInterface} CommandResults.reactInterface A react interface that is bound to the resulting message.
 * @prop    {Eris.Message}   CommandResults.rsp            The message object sent to Discord.
 */
