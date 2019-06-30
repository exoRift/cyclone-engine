const QueryBuilder = require('simple-knex')
let DBLAPI

const {
  _CommandHandler,
  _ReactionHandler
} = require('../modules')

/**
 * Class representing a bot Agent.
 */
class Agent {
  /**
   * Create an Agent.
   * @class
   * @param {Object}                                                   data                                     The agent data.
   * @prop  {Eris}                                                     data.Eris                                The Eris class the system runs off of.
   * @prop  {String}                                                   data.token                               The token to log in to the Discord API with.
   * @prop  {Object}                                                   [data.chData={}]                         The commands and replacers the bot will respond to
   * @prop  {Command[]}                                                [data.chData.commands]                   The commands for the bot.
   * @prop  {Replacer[]}                                               [data.chData.replacers]                  The replacers for the bot.
   * @prop  {Object}                                                   [data.chData.replacerBraces]             The braces that invoke a replacer.
   * @prop  {String}                                                   [data.chData.replacerBraces.open='|']    The opening brace.
   * @prop  {String}                                                   [data.chData.replacerBraces.close]       The closing brace.
   * @prop  {ReactionCommand[]}                                        [data.chData.reactCommands]              The commands that trigger on reactions.
   * @prop  {Object}                                                   [data.databaseOptions={}]                The info for the database the bot utilizes.
   * @prop  {String}                                                   data.databaseOptions.connectionURL       The URL for connecting to the bot's database.
   * @prop  {String}                                                   data.databaseOptions.client              The database driver being used.
   * @prop  {Object[]}                                                 [data.databaseOptions.tables=[]]         The initial tables to set up for the database.
   * @prop  {String[]}                                                 [data.databaseOptions.clearEmptyRows=[]] The list of tables to have their unchanged from default rows cleared.
   * @prop  {Object}                                                   [data.agentOptions={}]                   Options for the agent.
   * @prop  {Number}                                                   [data.agentOptions.connectRetryLimit=10] How many times the agent will attempt to establish a connection with Discord before giving up.
   * @prop  {String}                                                   [data.agentOptions.prefix='!']           The prefix for bot commands.
   * @prop  {Boolean}                                                  [data.agentOptions.fireOnRemove=false]   Whether the reaction handler is triggered on the removal of reactions as well.
   * @prop  {String}                                                   [data.agentOptions.dblToken]             The token used to connect to the Discord Bot Labs API.
   * @prop  {function(Agent)}                                          [data.agentOptions.loopFunction]         A function that will run every loopInterval amount of ms, supplied the agent.
   * @prop  {Number}                                                   [data.agentOptions.loopInterval=30000]   The interval at which the loopFunction runs.
   * @prop  {function(msg: Eris.Message, res: CommandResults): String} [data.agentOptions.logFunction]          A function that returns a string that's logged for every command.
   * @prop  {Number}                                                   [data.agentOptions.maxInterfaces=1500]   The maximum amount of reaction interfaces cached before they start getting deleted.
   */
  constructor ({ Eris, token, chData = {}, databaseOptions = {}, agentOptions = {} }) {
    const {
      commands,
      replacers,
      replacerBraces,
      reactCommands
    } = chData
    const {
      connectionURL,
      client,
      tables = [],
      clearEmptyRows = []
    } = databaseOptions
    const {
      connectRetryLimit = 10,
      prefix = '!',
      fireOnRemove,
      dblToken,
      loopFunction,
      loopInterval = 300000,
      logFunction,
      maxInterfaces
    } = agentOptions

    /**
     * The commands for the command handler.
     * @private
     * @type    {Command[]}
     */
    this._commands = commands

    /**
     * The replacers for the command handler.
     * @private
     * @type    {Replacer[]}
     */
    this._replacers = replacers

    /**
     * The braces that invoke a replacer.
     * @private
     * @type    {Object}
     */
    this._replacerBraces = replacerBraces

    /**
     * The commands that trigger on reactions.
     * @private
     * @type    {ReactionCommand[]}
     */
    this._reactCommands = reactCommands

    /**
     * The Eris client.
     * @private
     * @type    {Eris.Client}
     */
    this._client = new Eris(token)

    if (connectionURL) {
      /**
       * The simple-knex query builder.
       * @private
       * @type    {QueryBuilder}
       */
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
     * @type    {Number}
     */
    this._connectRetryLimit = connectRetryLimit

    /**
     * The command prefix.
     * @private
     * @type    {String}
     */
    this._prefix = prefix

    /**
     * Whether the reaction handler triggers on the removal of reactions.
     * @private
     * @type    {Boolean}
     */
    this._fireOnRemove = fireOnRemove

    if (dblToken) {
      DBLAPI = require('dblapi.js')
      /**
       * The dblapi.js DBLAPI (DiscordBotsList).
       * @type {DBLAPI}
       */
      this._dblAPI = new DBLAPI(dblToken, this._client)
    }

    /**
     * A function that returns a string that's logged for every command.
     * @private
     * @type    {function(msg: Eris.Message, res: CommandResults): String}
     */
    this._logFunction = logFunction

    /**
     * The maximum amount of interfaces cached before they start getting deleted.
     * @private
     * @type    {Number}
     */
    this._maxInterfaces = maxInterfaces

    this._bindEvents()

    if (loopFunction) this._setLoop(loopFunction, loopInterval)
  }

  /**
   * Connect to the Discord API. Will recursively retry this._connectRetryLimit number of times.
   * @param {Number} [_count=1] The current number of connection attempts. (Do not supply)
   */
  connect (_count = 1) {
    if (_count <= this._connectRetryLimit) {
      console.log(`CONNECTION ATTEMPT ${_count}`)
      return this._client.connect().catch(() => this.connect(_count + 1))
    }
    return console.error('RECONNECTION LIMIT REACHED; RECONNECTION CANCELED')
  }

  /**
   * Get the last message sent by the bot in a given channel.
   * @param   {Eris.Channel} channel The channel to pick your last message from.
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
   * @async
   * @param   {Object[]} tables         The initial tables set up for the bot.
   * @param   {String[]} clearEmptyRows The tables that have their unchanged rows cleared.
   */
  async _prepareDB (tables, clearEmptyRows) {
    const tableNames = tables.map((t) => t.name)
    return Promise.all(tables.map((table) => this._knex.createTable(table)))
      .catch((ignore) => ignore)
      .finally(() => {
        for (const table of clearEmptyRows) {
          if (!tableNames.includes(table)) throw Error('Provided a non-existent table')
          const columns = tables.find((t) => t.name === table).columns.reduce((accum, element) => {
            if (element.default) accum[element.name] = element.default
            return accum
          }, {})
          return this._knex.delete({
            table,
            where: columns
          })
        }
      }).then(() => console.log('Database set up!'))
  }

  /**
   * Begin the loop function provided in the constructor.
   * @private
   * @param   {Function} func     The function run every interval. (Param is the agent)
   * @param   {Number}          interval How many milliseconds in between each call.
   */
  _setLoop (func, interval) {
    setInterval(() => func(this), interval)
  }

  /**
   * Send an error message.
   * @private
   * @param   {Error}        err   The error.
   * @param   {Eris.Message} msg   The original message from Discord.
   * @param   {String}       [res] The response from a command.
   */
  _handleError (err, msg) {
    return msg.channel.createMessage(`ERR:\n\`\`\`\n${err.message}\`\`\`\n\`\`\`\n${err.stack}\`\`\``)
      .catch(() => {
        console.error(err)
        return msg.channel.createMessage(`ERROR, SEND TO A BOT ADMIN: \`${Date.now()}\``)
      })
      .catch((err) => console.error('Error in error handler: ', err))
  }

  /**
   * Bind function to events.
   * @private
   */
  _bindEvents () {
    this._client.on('ready', this._onReady.bind(this, this._client))
    this._client.on('error', this._onError.bind(this, this._client))
    this._client.on('messageCreate', this._onMessage.bind(this, this._client))
    this._client.on('messageReactionAdd', this._onReaction.bind(this, this._client))
    if (this._fireOnRemove) this._client.on('messageReactionRemove', this._onReaction.bind(this, this._client))
    this._client.on('shardReady', this._onShardReady.bind(this, this._client))
    this._client.on('shardDisconnect', this._onShardDisconnect.bind(this, this._client))
  }

  /**
   * What to do when a message is recived.
   * @private
   * @param   {Eris.Client}  client The Eris client.
   * @param   {Eris.Message} msg    The recieved message.
   */
  _onMessage (client, msg) {
    if (msg.author.bot) return

    return this._commandHandler.handle(msg)
      .then((res) => {
        if (res && this._logFunction) console.log(this._logFunction(msg, res))
      })
      .catch((err) => this._handleError(err, msg))
  }

  /**
   * What to do when a reaction is recieved.
   * @private
   * @param   {Eris.Client}  client The Eris client.
   * @param   {Eris.Message} msg    The message reacted on.
   * @param   {Eris.Emoji}   emoji  The emoji used to react.
   * @param   {String}       userID The ID of the user who reacted.
   */
  _onReaction (client, msg, emoji, userID) {
    const user = client.users.get(userID)
    if (user.bot) return

    return this._reactionHandler.handle(msg, emoji, user)
      .catch((err) => this._handleError(err, msg))
  }

  /**
   * What to do when the client's ready.
   * @private
   * @async
   * @param   {Eris.Client} client The Eris client/
   */
  async _onReady (client) {
    const ownerID = (await client.getOAuthApplication()).owner.id

    console.log('Initializing Command Handler')

    /**
     * The command handler for the bot.
     * @private
     * @type    {CommandHandler}
     */
    this._commandHandler = new _CommandHandler({
      agent: this,
      prefix: this._prefix,
      client,
      ownerID,
      knex: this._knex,
      commands: this._commands,
      replacers: this._replacers,
      replacerBraces: this._replacerBraces
    })
    if (this._reactCommands) {
      console.log('Initializing Reaction Handler')

      /**
       * The reaction handler for the bot.
       * @private
       * @type    {ReactionHandler}
       */
      this._reactionHandler = new _ReactionHandler({
        agent: this,
        client,
        ownerID,
        knex: this._knex,
        reactCommands: this._reactCommands,
        options: {
          maxInterfaces: this._maxInterfaces
        }
      })
    }
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
    if (this._dblAPI) this._dblAPI.postStats(client.guilds.size, shard, client.shards.size).catch((err) => this._onError(this._client, err))
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
    console.error('An error has occured', error)
  }
}

module.exports = Agent

/**
 * Object returned by a command.
 * @typedef  {Object}       CommandResults
 * @prop     {Command}      command        The object of the command called.
 * @prop     {String}       content        The resulting message content sent by the bot.
 * @prop     {Eris.Embed}   embed          The resulting embed sent by the bot.
 * @prop     {Buffer}       file           The resulting file sent by the bot.
 * @prop     {Eris.Message} rsp            The message object sent to Discord.
 */
