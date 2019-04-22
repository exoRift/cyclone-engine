const Command = require('../command')
const Await = require('../await')
const Replacer = require('../replacer')

/**
 * A class reprsenting the command handler.
 */
class CommandHandler {
  /**
   * Create a CommandHandler
   * @param    {Object}              data                            The command handler data.
   * @property {Agent}               [data.agent={}]                 The agent managing the bot.
   * @property {String}              data.prefix                     The prefix of commands.
   * @property {Eris.Client}         data.client                     The Eris client.
   * @property {String}              data.ownerId                    The ID of the bot owner.
   * @property {QueryBuilder}        [data.knex]                     The simple-knex query builder.
   * @property {Command[]|Command}   [data.commands=[]]              Map of commands to load initially.
   * @property {Replacer[]|Replacer} [data.replacers=[]]             The message content replacers.
   * @property {Object}              [data.replacerBraces={}]        The braces that invoke a replacer.
   * @property {String}              [data.replacerBraces.open='|']  The opening brace.
   * @property {String}              [data.replacerBraces.close='|'] The closing brace.
   */
  constructor ({ agent = {}, prefix, client, ownerId, knex, commands = [], replacers = [], replacerBraces = {} }) {
    /**
     * The agent managing the bot.
     * @type {Agent}
     */
    this._agent = agent
    /**
     * The prefix of commands.
     * @type {String}
     */
    this._prefix = prefix
    /**
     * The Eris Client.
     * @type {Eris}
     */
    this._client = client
    /**
     * The ID of the bot owner.
     * @type {String}
     */
    this._ownerId = ownerId
    /**
     * The simple-knex query builder.
     * @type {QueryBuilder}
     */
    this._knex = knex
    /**
     * Map of commands to load initially.
     * @type {Map<String, Command>}
     */
    this._commands = new Map()
    /**
     * The message content replacers.
     * @type {Map<String, Replacer>}
     */
    this._replacers = new Map()
    const {
      open = '|',
      close = '|'
    } = replacerBraces
    if (open.includes(prefix)) console.log('WARNING: Your replacer opening brace includes your prefix. This could lead to some issues.')
    /**
     * The braces that invoke a replacer.
     * @type {Object}
     */
    this._replacerBraces = {
      open,
      close
    }
    /**
     * An object containing message data used to wait for a user's response.
     * @type {Map<String, AwaitData>}
     */
    this._awaits = new Map()

    this.loadCommands(commands)
    this.loadReplacers(replacers)
  }

  /**
   * Handle incoming Discord messages.
   * @param   {Eris.Message} msg The Discord message.
   * @returns {Object}           The results of the command.
   */
  async handle (msg) {
    let text = this._runReplacers(msg.content)

    let awaited = this._awaits.get(msg.channel.id + msg.author.id)
    if (awaited && !awaited.check({ prefix: this._prefix, msg })) {
      if (awaited.oneTime) awaited.clear()
      awaited = undefined
    }
    if (awaited) awaited.clear()
    else {
      text = this._replaceMentionWithPrefix(text)
      if (!text.startsWith(this._prefix)) return
      text = text.substring(this._prefix.length)
    }

    let args = text.split(' ')
    const keyword = args.shift()
    const command = awaited || this._commands.get(keyword)

    if (!command) return
    if (command.restricted && msg.author.id !== this._ownerId) throw Error('This command is either temporarily disabled, or restricted.')

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

    if (content || embed || file) {
      if (file && !(file instanceof Buffer)) throw TypeError('Supplied file not a Buffer instance:\n', file)
      return msg.channel.createMessage({ content, embed }, file)
        .then((rsp) => {
          if (wait && wait instanceof Await) this._addAwait(msg, rsp, wait)
          return { command, content, embed, file }
        })
    }
  }

  /**
   * Load commands.
   * @param {Command[]|Command} commands The command(s) to load.
   */
  loadCommands (commands) {
    if (commands instanceof Array) {
      for (let i = 0; i < commands.length; i++) {
        this._loadCommand(commands[i])
      }
    } else {
      this._loadCommand(commands)
    }
  }

  /**
   * Load replacers.
   * @param {Replacer[]|Replacer} replacers The replacer(s) to load.
   */
  loadReplacers (replacers) {
    if (replacers instanceof Array) {
      for (let i = 0; i < replacers.length; i++) {
        this._loadReplacer(replacers[i])
      }
    } else {
      this._loadReplacer(replacers)
    }
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
   * @param   {String} table The name of the table.
   * @param   {String} id    The ID of the user
   * @returns {Object}       The user's data.
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
      const split = capture.split(' ')
      for (const [key, value] of this._replacers.entries()) {
        if ((value.start && split.length > 1 && key === split[0]) || key === capture) return value.action({ content, capture })
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
    if (!(command instanceof Command)) throw TypeError('Supplied commands not Command instances:\n', command)
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
    if (!(replacer instanceof Replacer)) throw TypeError('Supplied replacers not Replacer instances:\n', replacer)
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
   * @param   {Await}   wait The command we are awaiting.
   */
  async _addAwait (msg, rsp, wait) {
    const id = msg.channel.id + msg.author.id
    const timer = setTimeout(() => this._awaits.delete(id), wait.timeout)
    this._awaits.set(id, {
      id,
      lastResponse: rsp,
      ...wait,
      timestamp: Date.now(),
      timer,
      clear: () => {
        clearTimeout(timer)
        this._awaits.delete(id)
      }
    })
  }
}

module.exports = CommandHandler
