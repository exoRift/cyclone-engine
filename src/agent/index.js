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
   * @param    {Eris}            Eris                      The Eris class.
   * @param    {String}          token                     The token to log in to the Discord API with.
   * @param    {Object}          data                      An object containing command and replacer data.
   * @property {Map}             commands                  The commands for the bot.
   * @property {Map}             [replacers]               The replacers for the bot.
   * @param    {DatabaseOptions} [databaseOptions]         The info for the database.
   * @property {String}          [connectionURL]           The URL for connecting to the bot's database.
   * @property {String}          client                    The database driver being used.
   * @property {DatabaseTable[]} tables                    The tables to be created on bot launch.
   * @property {String[]}        [clearEmptyRows=[]]       The list of tables to have their unchanged from default rows cleared.
   * @param    {AgentOptions}    [agentOptions]            Options for the agent.
   * @property {Number}          [connectRetryLimit=10]    How many times the agent will attempt to establish a connection with Discord before giving up.
   * @property {String}          [prefix='!']              The prefix for bot commands.
   * @property {DatabaseTable[]} [tables=[]]               The initial tables to set up for the database.
   * @property {function(agent)} [checkFunction]           A function that will run every checkInterval amount of ms, supplied the agent.
   * @property {Number}          [checkInterval=30000]     The interval at which the checkFunction runs.
   */
  constructor (Eris, token, data, databaseOptions, agentOptions = {}) {
    const {
      commands,
      replacers
    } = data
    /**
     * The commands for the command handler.
     * @type {Map}
     */
    this._commands = commands
    /**
     * The replacers for the command handler.
     * @type {Map}
     */
    this._replacers = replacers

    const {
      connectionURL,
      client,
      tables = [],
      clearEmptyRows = []
    } = databaseOptions
    const {
      connectRetryLimit = 10,
      prefix = '!',
      dblToken,
      checkFunction,
      checkInterval = 300000
    } = agentOptions
    /**
     * The eris Client.
     * @type {Eris.Client}
     */
    this._client = new Eris.Client(token)
    /**
     * The simple-knex QueryBuilder.
     * @type {QueryBuilder}
     */
    this._knex = new QueryBuilder({
      connection: connectionURL,
      client,
      pool: {
        min: 1,
        max: 1
      }
    })
    /**
     * The dblapi.js DBLAPI (DiscordBotsList).
     * @type {DBLAPI}
     */
    if (dblToken) {
      DBLAPI = require('dblapi.js')
      this._dblAPI = new DBLAPI(dblToken, this._client)
    }
    /**
     * The maximum number of times to retry connecting to the Discord API.
     * @type {Number}
     */
    this._connectRetryLimit = connectRetryLimit
    /**
     * The command prefix.
     * @type {String}
     */
    this._prefix = prefix

    // setup
    this._bindEvents()
    this._prepareDB(tables, clearEmptyRows)
    if (checkFunction) this._setCheck(checkFunction, checkInterval)
  }
  /**
   * Connect to the Discord API. Will recursively retry this._connectRetryLimit number of times.
   * @param {Number} count The current number of connection attempts.
   */
  connect (count = 0) {
    console.log(`CONNECTION ATTEMPT ${count + 1}`)
    if (count <= this._connectRetryLimit) return this._client.connect().catch(() => this.connect(count + 1))
    return console.error('RECONNECTION LIMIT REACHED; RECONNECTION CANCELED')
  }

  /**
   * Get the last message sent by the bot in a given channel.
   * @param {Channel} channel The channel to pick your last message from.
   */
  lastMessage (channel) {
    const {
      messages,
      guild
    } = channel
    const filtered = messages.filter((m) => m.author.id === guild.shard.client.user.id)
    return filtered[filtered.length - 1]
  }

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
  _bindEvents () {
    this._client.on('ready', this._onReady.bind(this, this._client))
    this._client.on('error', this._onError.bind(this, this._client))
    this._client.on('messageCreate', this._onCreateMessage.bind(this, this._client))
    this._client.on('shardReady', this._onShardReady.bind(this, this._client))
    this._client.on('shardDisconnect', this._onShardDisconnect.bind(this, this._client))
  }
  _setCheck (func, interval) {
    setInterval(() => func(this), interval)
  }
  /**
   * Send an error message.
   * @private
   * @param  {Error}   err   The error.
   * @param  {Message} msg   The original message from Discord.
   * @param  {*}       [res] The response from a command.
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
  _onCreateMessage (client, msg) {
    if (msg.author.bot) return

    this.__CommandHandler.handle(msg)
      .catch((err) => this._handleError(err, msg))
  }
  async _onReady (client) {
    console.log('Initializing Command Handler')
    this.__CommandHandler = new _CommandHandler({
      agent: this,
      prefix: this._prefix,
      client,
      ownerId: (await client.getOAuthApplication()).owner.id,
      knex: this._knex,
      replacers: (await this._replacers()),
      commands: (await this._commands())
    })
  }
  _onShardReady (client, shard) {
    console.log(`Connected as ${client.user.username} on shard ${shard}`)
    client.shards.get(shard).editStatus({
      name: `Prefix: '${process.env.PREFIX}'`,
      type: 2
    })
    if (this._dblAPI) this._dblAPI.postStats(client.guilds.size, shard, client.shards.size)
  }
  _onShardDisconnect (client, shard) {
    console.log(`Shard ${shard} lost connection`)
    this.connect()
  }
  _onError (client, error) {
    console.error('Error has occured', error)
  }
}

module.exports = Agent
/**
 * @typedef  {Object}  DatabaseColumn
 * @property {String}  name            The name of the database column.
 * @property {String}  type            The data type of the database column.
 * @property {Boolean} [primary=false] Whether or not this column is the primary key of the table.
 * @property {*}       [default]       The default value of this column, should match this column's type.
 */
/**
 * @typedef  {Object}           DatabaseTable
 * @property {String}           name          The name of the table.
 * @property {DatabaseColumn[]} columns       The columns of the table to store data in.
 */
