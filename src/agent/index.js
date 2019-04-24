const QueryBuilder = require('simple-knex')
let DBLAPI

const {
  _CommandHandler
} = require('../modules')

/**
 * Class representing a bot Agent.
 */
class Agent {
  /**
   * Create an Agent.
   * @param    {Object}   data                                     The agent data.
   * @property {Eris}     data.Eris                                The Eris class.
   * @property {String}   data.token                               The token to log in to the Discord API with.
   * @property {Object}   data.chData                              An object containing command and replacer data.
   * @property {Map}      [data.chData.commands]                   The commands for the bot.
   * @property {Map}      [data.chData.replacers]                  The replacers for the bot.
   * @property {Object}   [data.chData.replacerBraces]             The braces that invoke a replacer.
   * @property {String}   [data.chData.replacerBraces.open='|']    The opening brace.
   * @property {String}   [data.chData.replacerBraces.close]       The closing brace.
   * @property {Object}   [data.databaseOptions]                   The info for the database.
   * @property {String}   data.databaseOptions.connectionURL       The URL for connecting to the bot's database.
   * @property {String}   data.databaseOptions.client              The database driver being used.
   * @property {Object[]} [data.databaseOptions.tables=[]]         The initial tables to set up for the database.
   * @property {String[]} [data.databaseOptions.clearEmptyRows=[]] The list of tables to have their unchanged from default rows cleared.
   * @property {Object}   [data.agentOptions={}]                   Options for the agent.
   * @property {Number}   [data.agentOptions.connectRetryLimit=10] How many times the agent will attempt to establish a connection with Discord before giving up.
   * @property {String}   [data.agentOptions.prefix='!']           The prefix for bot commands.
   * @property {String}   [data.agentOptions.dblToken]             The token used to connect to the Discord Bot Labs API.
   * @property {Function} [data.agentOptions.loopFunction]         A function that will run every loopInterval amount of ms, supplied the agent. (Param is the agent)
   * @property {Number}   [data.agentOptions.loopInterval=30000]   The interval at which the loopFunction runs.
   * @property {Function} [data.agentOptions.logFunction]          A function that returns a string that's logged for every command. (Check docs for params)
   */
  constructor ({ Eris, token, chData = {}, databaseOptions = {}, agentOptions = {} }) {
    const {
      commands,
      replacers,
      replacerBraces
    } = chData
    /**
     * The commands for the command handler.
     * @private
     * @type {Map}
     */
    this._commands = commands
    /**
     * The replacers for the command handler.
     * @private
     * @type {Map}
     */
    this._replacers = replacers
    /**
     * The braces that invoke a replacer.
     * @private
     * @type {Object}
     */
    this._replacerBraces = replacerBraces

    const {
      connectionURL,
      client,
      tables = [],
      clearEmptyRows = []
    } = databaseOptions
    const {
      connectRetryLimit = 10,
      prefix,
      dblToken,
      loopFunction,
      loopInterval = 300000,
      logFunction
    } = agentOptions
    /**
     * The Eris client.
     * @private
     * @type {Eris.Client}
     */
    this._client = new Eris(token)
    /**
     * The simple-knex query builder.
     * @private
     * @type {QueryBuilder}
     */
    if (connectionURL) {
      this._knex = new QueryBuilder({
        connection: connectionURL,
        client,
        pool: {
          min: 1,
          max: 1
        }
      })
      this._prepareDB(tables, clearEmptyRows)
    }
    /**
     * How many times the agent will attempt to establish a connection with Discord before giving up.
     * @private
     * @type {Number}
     */
    this._connectRetryLimit = connectRetryLimit
    /**
     * The command prefix.
     * @private
     * @type {String}
     */
    this._prefix = prefix
    /**
     * The dblapi.js DBLAPI (DiscordBotsList).
     * @type {DBLAPI}
     */
    if (dblToken) {
      DBLAPI = require('dblapi.js')
      this._dblAPI = new DBLAPI(dblToken, this._client)
    }

    /**
     * A function that returns a string that's logged for every command. (Check docs for params)
     * @private
     * @type {Function}
     */
    this._logFunction = logFunction

    this._bindEvents()
    if (loopFunction) this._setLoop(loopFunction, loopInterval)
  }

  /**
   * Connect to the Discord API. Will recursively retry this._connectRetryLimit number of times.
   * @param {Number} [count=1] The current number of connection attempts. (Do not supply)
   */
  connect (count = 1) {
    console.log(`CONNECTION ATTEMPT ${count}`)
    if (count < this._connectRetryLimit) return this._client.connect().catch(() => this.connect(count + 1))
    return console.error('RECONNECTION LIMIT REACHED; RECONNECTION CANCELED')
  }

  /**
   * Get the last message sent by the bot in a given channel.
   * @param   {Channel}      channel The channel to pick your last message from.
   * @returns {Eris.Message}         The last message.
   */
  lastMessage (channel) {
    const {
      messages,
      guild
    } = channel
    const filtered = messages.filter((m) => m.author.id === guild.shard.client.user.id)
    return filtered[filtered.length - 1]
  }

  /**
   * Prepare the database for the agent.
   * @private
   * @param   {Object[]} tables         The initial tables set up for the bot.
   * @param   {String[]} clearEmptyRows The tables that have their unchanged rows cleared.
   */
  _prepareDB (tables, clearEmptyRows) {
    Promise.all(tables.map((table) => this._knex.createTable(table)))
      .catch((ignore) => ignore)
      .finally(() => {
        for (const table of clearEmptyRows) {
          const columns = tables.reduce((accum, element) => {
            if (clearEmptyRows.includes(element.name) && element.default) accum[element.name] = element.default
            return accum
          }, {})
          console.log(columns)
          this._knex.delete({
            table,
            where: columns
          })
        }
      })
      .then(() => console.log('Database set up!'))
  }

  /**
   * Bind function to events.
   * @private
   */
  _bindEvents () {
    this._client.on('ready', this._onReady.bind(this, this._client))
    this._client.on('error', this._onError.bind(this, this._client))
    this._client.on('messageCreate', this._onCreateMessage.bind(this, this._client))
    this._client.on('shardReady', this._onShardReady.bind(this, this._client))
    this._client.on('shardDisconnect', this._onShardDisconnect.bind(this, this._client))
  }

  /**
   * Begin the loop function provided in the constructor.
   * @private
   * @param   {function(agent)} func     The function run every interval. (Param is the agent)
   * @param   {Number}          interval How many milliseconds in between each call.
   */
  _setLoop (func, interval) {
    setInterval(() => func(this), interval)
  }

  /**
   * Send an error message.
   * @private
   * @param   {Error}   err   The error.
   * @param   {Message} msg   The original message from Discord.
   * @param   {*}       [res] The response from a command.
   */
  _handleError (err, msg, res) {
    if (res && typeof response === 'string' && err.code === 50035) {
      msg.channel.createMessage({
        content: 'Text was too long, sent as a file instead.',
        file: {
          name: 'Gaijin Result',
          file: Buffer.from(res)
        }
      })
    } else {
      msg.channel.createMessage('ERR:```\n' + err.message + '```\n```\n' + err.stack + '```')
        .catch(() => {
          console.error(err)
          msg.channel.createMessage('`ERROR, SEND TO A BOT ADMIN: `' + Date.now())
        })
        .catch((err) => console.error('Error in error handler: ', err))
    }
  }
  /**
   * What to do when a message is recived.
   * @private
   * @param   {Eris.Client}  client The Eris client.
   * @param   {Eris.Message} msg    The recieved message.
   */
  _onCreateMessage (client, msg) {
    if (msg.author.bot) return

    this.__CommandHandler.handle(msg)
      .catch((err) => this._handleError(err, msg))
      .then((res) => console.log(this._logFunction(res)))
  }
  /**
   * What to do when the client's ready.
   * @private
   * @param   {Eris.Client} client The Eris client/
   */
  async _onReady (client) {
    console.log('Initializing Command Handler')
    this.__CommandHandler = new _CommandHandler({
      agent: this,
      prefix: this._prefix,
      client,
      ownerId: (await client.getOAuthApplication()).owner.id,
      knex: this._knex,
      commands: (await this._commands()),
      replacers: (await this._replacers()),
      replacerBraces: this._replacerBraces
    })
  }
  /**
   * What to do when a shard is ready.
   * @private
   * @param   {Eris.Client} client The Eris client.
   * @param   {Eris.Shard}  shard  The shard that's ready.
   */
  _onShardReady (client, shard) {
    console.log(`Connected as ${client.user.username} on shard ${shard}`)
    client.shards.get(shard).editStatus({
      name: `Prefix: '${this._prefix}'`,
      type: 2
    })
    if (this._dblAPI) this._dblAPI.postStats(client.guilds.size, shard, client.shards.size)
  }
  /**
   * What to do when a shard loses connection.
   * @private
   * @param   {Eris.Client} client The Eris client.
   * @param   {Eris.Shard}  shard  The disconnected shard.
   */
  _onShardDisconnect (client, shard) {
    console.log(`Shard ${shard} lost connection`)
    this.connect()
  }
  /**
   * What to do when an unknown error occurs.
   * @private
   * @param   {Eris.Client} client The Eris client.
   * @param   {Error}       error  The error.
   */
  _onError (client, error) {
    console.error('Error has occured', error)
  }
}

module.exports = Agent
