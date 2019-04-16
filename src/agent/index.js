const Eris = require('eris')
const QueryBuilder = require('simple-knex')
let DBLAPI

const {
  CommandHandler
} = require('../modules')

/**
 * Class representing a bot Agent.
 */
class Agent {
  /**
   * Create an Agent.
   * @param {String}          token           The token to log in to the Discord API with.
   * @param {Object}          data            An object containing command and replacer data.
   * @param {DatabaseOptions} databaseOptions The info for the database.
   * @param {AgentOptions}    [agentOptions]  Options for the agent.
   */
  constructor (token, data, databaseOptions, agentOptions = {}) {
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
      tables = []
    } = databaseOptions
    const {
      connectRetryLimit = 10,
      prefix = '!',
      dblToken,
      dblWidget = '',
      remindersCheckInterval = 300000
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
     * The DiscordBotsList widget URL.
     */
    this._dblWidget = dblWidget
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
    this._prepareDB(tables)
    this._setRemindersCheck(remindersCheckInterval)
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
   * Get the last message sent by the bot in a given channel
   * @param {Channel} channel The channel to pick your last message from
   */
  lastMessage (channel) {
    const {
      messages,
      guild
    } = channel
    const filtered = messages.filter((m) => m.author.id === guild.shard.client.user.id)
    return filtered[filtered.length - 1]
  }

  _prepareDB (tables) {
    Promise.all(tables.map((table) => this._knex.createTable(table)))
      .catch((ignore) => ignore)
      .finally(() => this._knex.delete({
        table: 'users',
        where: {
          notes: '[]',
          reminders: '[]'
        }
      }))
      .then(() => console.log('Database set up!'))
  }
  _bindEvents () {
    this._client.on('ready', this._onReady.bind(this, this._client))
    this._client.on('error', this._onError.bind(this, this._client))
    this._client.on('messageCreate', this._onCreateMessage.bind(this, this._client))
    this._client.on('shardReady', this._onShardReady.bind(this, this._client))
    this._client.on('shardDisconnect', this._onShardDisconnect.bind(this, this._client))
  }
  _setRemindersCheck (remindersCheckInterval) {
    setInterval(async () => {
      const users = await this._knex.select('users')
      if (!users) return
      for (const user of users) {
        for (let i = 0; i < user.reminders; i++) {
          const reminder = user.reminders[i]
          if (Date.now() < new Date(reminder.date).getTime()) continue
          user.getDMChannel()
            .then((channel) => channel.createMessage(
              `__REMINDER__:\n**${reminder.name}**\n${reminder.desc}\n-*${new Date(reminder.date).toString()}*`
            ))
            .then(() => { user.reminders[i] = null })
            .catch((err) => console.error(`Could not dm user with id: ${user.id}: `, err))
        }
        const newReminders = user.reminders.filter((reminder) => reminder !== null)
        if (newReminders.length === user.reminders.length) continue
        this._knex.update({
          table: 'users',
          where: {
            id: user.id
          },
          data: {
            reminders: newReminders
          }
        })
      }
    }, remindersCheckInterval)
  }
  /**
   * Send an error message.
   * @private
   * @param  {Error}   err   The error
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

    this._commandHandler.handle(msg)
      .catch((err) => this._handleError(err, msg))
  }
  async _onReady (client) {
    console.log('Initializing Command Handler')
    this._commandHandler = new CommandHandler({
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
    this._dblAPI.postStats(client.guilds.size, shard, client.shards.size)
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
 * @typedef  {Object}   DatabaseTable
 * @property {String}   name    The name of the table.
 * @property {Column[]} columns The columns of the table to store data in.
 */
/**
 * @typedef  {Object}  DatabaseOptions
 * @property {String}  connectionURL The database url.
 * @property {Table[]} [tables]      The additional tables to create in the database.
 */
/**
 * @typedef  {Object} AgentOptions
 * @property {Number} [connectRetryLimit=10]           The maximum number of times to retry connecting to the Discord API.
 * @property {String} [prefix='!']                     The command prefix.
 * @property {String} [dblToken]                       The token used with the DiscordBotsList API.
 * @property {String} [dblWidget='']                   The URL of your DBL widget.
 * @property {Number} [remindersCheckInterval=3000000] The amount of time to wait between checking on reminders.
 */
