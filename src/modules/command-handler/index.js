const Command = require('../command')
const Await = require('../await')
const Replacer = require('../replacer')

/**
 * A class reprsenting the command handler.
 */
class CommandHandler {
  /**
   * Create a CommandHandler
   * @param {CommandHandlerData} data The command handler data.
   */
  constructor ({ agent, prefix, client, ownerId, knex, replacers = [], commands = [] }) {
    /**
     * The prefix of commands.
     * @type {String}
     */
    this._prefix = prefix
    /**
     * The Eris Client.
     * @type {Client}
     */
    this._client = client
    /**
     * The custom bot agent.
     */
    this._agent = agent
    /**
     * The simple-knex query builder.
     * @type {QueryBuilder}
     */
    this._knex = knex
    /**
     * Map of commands.
     * @type {Map<String, Command>}
     */
    this._commands = new Map()
    /**
     * An object containing message data used to wait for user response.
     * @type {Map<String, AwaitData>}
     */
    this._awaits = new Map()
    /**
     * The ID of the bot owner.
     * @type {String}
     */
    this._ownerId = ownerId
    /**
     * Map of replacers.
     * @type {Map<String, Replacer>}
     */
    this._replacers = new Map()
    // Load commands
    this.loadCommands(commands)
    this.loadReplacers(replacers)
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
   * Handle incoming Discord messages.
   * @param {Message} msg The Discord message.
   */
  async handle (msg) {
    let text = this._replaceMentionWithPrefix(msg.content)
    if (!text.startsWith(this._prefix)) return

    text = text.substring(this._prefix.length)
    text = this._runReplacers(text)

    let awaited = this._awaits.get(msg.channel.id + msg.author.id)
    if (awaited && !awaited.check({ prefix: this._prefix, msg })) {
      if (awaited.oneTime) awaited.clear()
      awaited = undefined
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
      return msg.channel.createMessage({ content, embed }, file)
        .then((rsp) => {
          if (wait && wait instanceof Await) this._addAwait(msg, rsp, wait)
          return { content, embed, file }
        })
    }
  }

  _replaceMentionWithPrefix (content) {
    return content.replace(new RegExp(`^<@!?${this._client.user.id}> ?`), this._prefix)
  }

  async _handleDBRequest (table, id) {
    if (!this._knex) throw Error('QueryBuilder was not supplied to CommandHandler!')
    await this._knex.insert({ table, data: { id } }).catch((ignore) => ignore)
    return this._knex.get({ table, where: { id } })
  }

  /**
   * Check message content for stuff to replace.
   * @private
   * @param   {String} content The message content to run the replacers against.
   * @returns {String} The message content after replacement.
   */
  _runReplacers (content) {
    return content.replace(/\|(.+?)\|/g, (content, capture) => {
      const split = capture.split(' ')
      for (const [key, value] of this._replacers.entries()) {
        if ((value.start && split.length > 1 && key === split[0]) || key === capture) return value.action({ content, capture })
      }
      return 'Invalid Key'
    })
  }

  /**
   * Load a command.
   * @private
   * @param   {Command} command The command to load.
   */
  _loadCommand (command) {
    if (!(command instanceof Command)) throw TypeError('Not a command:\n', command)
    this._commands.set(command.name, command)
  }

  /**
   * Load a replacer.
   * @private
   * @param   {Replacer} replacer The replacer to load.
   */
  _loadReplacer (replacer) {
    if (!(replacer instanceof Replacer)) throw TypeError('Not a replacer:\n', replacer)
    this._replacers.set(replacer.key, replacer)
  }

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
   * @param {Message} msg  The message that started it all.
   * @param {Await}   wait The command we are awaiting.
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
/**
 * @typedef  {Object}              CommandHandlerData
 * @property {String}              prefix         The prefix of commands.
 * @property {Client}              client         The Eris client.
 * @property {String}              ownerId        The ID of the bot owner.
 * @property {QueryBuilder}        [knex]         The simple-knex query builder.
 * @property {Replacer[]|Replacer} [replacers=[]] The command arg replacers.
 * @property {Command[]|Command}   [commands=[]]  List of commands to load initially.
 */
/**
 * Context of awaiting messages.
 * @typedef  {Object}   AwaitData
 * @property {String}   id           The ID of the await.
 * @property {Message}  lastResponse The last message the bot sent in regards to this chain.
 * @property {Number}   timestamp    When the await was created.
 * @property {Number}   timeout      How many ms to wait before deleing the await.
 * @property {Boolean}  oneTime      Decide whether the await gets cleared after an unawaited message.
 * @property {Timeout}  timer        Timeout that will delete the await.
 * @property {Function} clear        A function that will clear the delete timer and delete the await.
 * @property {Function} check        A function to validate a future response.
 * @property {Function} action       The action of the await command.
 */
/**
 * Fancy keyword replacer.
 * @typedef  {Object}   Replacer
 * @property {String}   key      The keyword to replace.
 * @property {String}   desc     A description of what it does.
 * @property {Boolean}  start    Dunno what this is.
 * @property {Function} action   Function returning the string to replace with. (Param is an object containing: content, capture)
 */
