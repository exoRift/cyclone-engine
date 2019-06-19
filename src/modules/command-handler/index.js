const Command = require('../command')
const Await = require('../await')
const Replacer = require('../replacer')

/**
 * A class reprsenting the command handler.
 */
class CommandHandler {
  /**
   * Create a CommandHandler
   * @class
   * @param {Object}              data                            The command handler data.
   * @prop  {Agent}               [data.agent={}]                 The agent managing the bot.
   * @prop  {String}              [data.prefix='!']               The prefix of commands.
   * @prop  {Eris.Client}         data.client                     The Eris client.
   * @prop  {String}              data.ownerID                    The ID of the bot owner.
   * @prop  {QueryBuilder}        [data.knex]                     The simple-knex query builder.
   * @prop  {Command[]|Command}   [data.commands=[]]              Map of commands to load initially.
   * @prop  {Replacer[]|Replacer} [data.replacers=[]]             Map of the message content replacers to load initially.
   * @prop  {Object}              [data.replacerBraces={}]        The braces that invoke a replacer.
   * @prop  {String}              [data.replacerBraces.open='|']  The opening brace.
   * @prop  {String}              [data.replacerBraces.close='|'] The closing brace.
   */
  constructor ({ agent = {}, prefix = '!', client, ownerID, knex, commands = [], replacers = [], replacerBraces = {} }) {
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
     * Map of commands to load initially.
     * @private
     * @type    {Map<String, Command>}
     */
    this._commands = new Map()
    /**
     * Map of the message content replacers to load initially.
     * @private
     * @type    {Map<String, Replacer>}
     */
    this._replacers = new Map()
    const {
      open = '|',
      close = '|'
    } = replacerBraces
    if (open.startsWith(prefix)) console.log('WARNING: Your replacer opening brace starts with your prefix. This could lead to some issues.')
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
     * An object containing message data used to wait for a user's response.
     * @private
     * @type    {Map<String, AwaitData>}
     */
    this._awaits = new Map()

    this.loadCommands(commands)
    this.loadReplacers(replacers)
  }

  /**
   * Handle incoming Discord messages.
   * @param   {Eris.Message}            msg The Discord message.
   * @returns {Promise<CommandResults>}     The results of the command.
   */
  async handle (msg) {
    let text = this._runReplacers(msg.content)

    let awaited = this._awaits.get(msg.channel.id + msg.author.id)
    if (awaited) {
      if (!awaited.check({ prefix: this._prefix, msg })) {
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
    const keyword = args.shift()
    const command = awaited || this._commands.get(keyword)
    if (msg.content === '!awaittest 1') console.log(command, keyword)

    if (!command) return
    if (command.restricted && msg.author.id !== this._ownerID) throw Error('This command is either temporarily disabled, or restricted.')

    args = this._sanitizeArgs(command, args)
    if (command.args && (!args || args.length < command.args.filter((a) => a.mand).length)) throw Error('Invalid arguments. Reference the help menu.')
    let dbData
    if (command.dbTable) {
      dbData = await this._handleDBRequest(command.dbTable, msg.author.id)
    }

    const result = await command.action({
      agent: this._agent,
      client: this._client,
      commands: this._commands,
      replacers: this._replacers,
      msg,
      args,
      [command.dbTable]: dbData,
      knex: this._knex,
      lastResponse: command.lastResponse
    })

    if (!result) return

    const {
      content,
      embed,
      wait,
      file
    } = typeof result === 'string' ? { content: result } : result

    const _successfulResponse = (rsp) => {
      const awaitedCopy = { ...awaited }
      if (awaited) {
        if (awaited.refreshOnUse) awaited.refresh()
        else awaited.clear()
      }
      if (wait && wait instanceof Await) this._addAwait(msg, rsp, wait)
      return { command: awaitedCopy || command, content, embed, file, rsp }
    }

    if (content || embed || file) {
      if (file && !(file instanceof Buffer)) throw TypeError('Supplied file not a Buffer instance:\n', file)
      return msg.channel.createMessage({ content, embed }, file)
        .catch((err) => {
          if (err.code === 50035) {
            return msg.channel.createMessage({
              content: 'Text was too long, sent as a file instead.',
              file: {
                name: 'Command Result',
                file: Buffer.from(content)
              }
            }).then(_successfulResponse)
          }
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
      for (let i = 0; i < commands.length; i++) this._loadCommand(commands[i])
    } else this._loadCommand(commands)
  }

  /**
   * Load replacers.
   * @param {Replacer[]|Replacer} replacers The replacer(s) to load.
   */
  loadReplacers (replacers) {
    if (replacers instanceof Array) {
      for (let i = 0; i < replacers.length; i++) this._loadReplacer(replacers[i])
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
    if (!(command instanceof Command)) throw TypeError('Supplied commands not Command instances:\n')
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
    if (!(replacer instanceof Replacer)) throw TypeError('Supplied replacers not Replacer instances:\n')
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
   * @param   {Message} msg  The message that started it all.
   * @param   {Message} rsp  The last response to the command that created the await.
   * @param   {Await}   wait The command we are awaiting.
   */
  async _addAwait (msg, rsp, wait) {
    const id = msg.channel.id + msg.author.id
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
 * @typedef  {Object}       CommandResults
 * @prop     {Command}      command        The object of the command called.
 * @prop     {String}       content        The resulting message content sent by the bot.
 * @prop     {Eris.Embed}   embed          The resulting embed sent by the bot.
 * @prop     {Buffer}       file           The resulting file sent by the bot.
 * @prop     {Eris.Message} rsp            The message object sent to Discord.
 */
