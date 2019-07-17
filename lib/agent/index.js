const QueryBuilder = require('simple-knex')
let DBLAPI

const {
  _CommandHandler,
  _ReactionHandler
} = require('../modules')

const { helpIcon } = require('../../assets/images.json')

const ignoreCodes = [
  50013,
  50001
]

/**
 * Class representing a bot Agent.
 */
class Agent {
  /**
   * Create an Agent.
   * @class
   * @param {Object}                                                                                  data                                           The agent data.
   * @prop  {Eris}                                                                                    data.Eris                                      The Eris class the system runs off of.
   * @prop  {String}                                                                                  data.token                                     The token to log in to the Discord API with.
   * @prop  {Object}                                                                                  [data.chData={}]                               The commands and replacers the bot will respond to
   * @prop  {Command[]}                                                                               [data.chData.commands]                         The commands for the bot.
   * @prop  {Replacer[]}                                                                              [data.chData.replacers]                        The replacers for the bot.
   * @prop  {Object}                                                                                  [data.chData.replacerBraces]                   The braces that invoke a replacer.
   * @prop  {String}                                                                                  [data.chData.replacerBraces.open='|']          The opening brace.
   * @prop  {String}                                                                                  [data.chData.replacerBraces.close]             The closing brace.
   * @prop  {ReactionCommand[]}                                                                       [data.chData.reactCommands]                    The commands that trigger on reactions.
   * @prop  {Object}                                                                                  [data.databaseOptions={}]                      The info for the database the bot utilizes.
   * @prop  {String}                                                                                  data.databaseOptions.connectionURL             The URL for connecting to the bot's database.
   * @prop  {String}                                                                                  data.databaseOptions.client                    The database driver being used.
   * @prop  {Object[]}                                                                                [data.databaseOptions.tables=[]]               The initial tables to set up for the database.
   * @prop  {String[]}                                                                                [data.databaseOptions.clearEmptyRows=[]]       The list of tables to have their unchanged from default rows cleared.
   * @prop  {Object}                                                                                  [data.agentOptions={}]                         Options for the agent.
   * @prop  {Number}                                                                                  [data.agentOptions.connectRetryLimit=10]       How many times the agent will attempt to establish a connection with Discord before giving up.
   * @prop  {String}                                                                                  [data.agentOptions.prefix='!']                 The prefix for bot commands.
   * @prop  {Object|function(agent: Agent, shard: Number, setStatus: function(data: Object)): Object} [data.agentOptions.statusMessage]              The status for the bot. It can be an object containing the data, or a callback function for each shard. By default, it's the bot's prefix.
   * @prop  {String}                                                                                  [data.agentOptions.dblToken]                   The token used to connect to the Discord Bot Labs API.
   * @prop  {function(Agent)}                                                                         [data.agentOptions.loopFunction]               A function that will run every loopInterval amount of ms, supplied the agent.
   * @prop  {Number}                                                                                  [data.agentOptions.loopInterval=30000]         The interval at which the loopFunction runs.
   * @prop  {Boolean}                                                                                 [data.agentOptions.fireOnEdit=false]           Whether the command handler is called when a command is edited or not.
   * @prop  {Boolean}                                                                                 [data.agentOptions.fireOnReactionRemove=false] Whether the reaction handler is triggered on the removal of reactions as well.
   * @prop  {function(msg: Eris.Message, res: CommandResults): *}                                     [data.agentOptions.postMessageFunction]        A function that runs after every message if it triggers a command.
   * @prop  {Number}                                                                                  [data.agentOptions.maxInterfaces=1500]         The maximum amount of reaction interfaces cached before they start getting deleted.
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
      statusMessage,
      dblToken,
      loopFunction,
      loopInterval = 300000,
      fireOnEdit,
      postMessageFunction,
      fireOnReactionRemove,
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
     * The status for the bot. It can be an object containing the data, or a callback function for each shard. By default, it's the bot's prefix.
     * @private
     * @type    {Object|function(agent: Agent, shard: Number, setStatus: function(data: Object)): Object}
     */
    this._statusMessage = statusMessage

    if (dblToken) {
      DBLAPI = require('dblapi.js')
      /**
       * The dblapi.js DBLAPI (DiscordBotsList).
       * @type {DBLAPI}
       */
      this._dblAPI = new DBLAPI(dblToken, this._client)
    }

    /**
     * Whether the command handler is called when a command is edited or not.
     * @type {Boolean}
     */
    this._fireOnEdit = fireOnEdit

    /**
     * A function that runs after every message if it triggers a command.
     * @private
     * @type    {function(msg: Eris.Message, res: CommandResults): String}
     */
    this._postMessageFunction = postMessageFunction

    /**
     * Whether the reaction handler triggers on the removal of reactions.
     * @private
     * @type    {Boolean}
     */
    this._fireOnReactionRemove = fireOnReactionRemove

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
   * Build an embed representing a help menu.
   * @async
   * @param   {Object}          data                         The data for the menu
   * @prop    {String}          data.description             The description of the bot
   * @prop    {String}          data.supportServerInviteCode The invite code to the support server. (Note: This is the code, not the link)
   * @prop    {Number}          data.color                   An integer color that changes the sidebar color of the embed.
   * @prop    {String}          data.prefixImage             A link leading to an image of the prefix. This is displayed in the footer.
   * @prop    {String}          data.version                 The version of the bot.
   * @prop    {Number}          data.page                    The page of the help menu to load.
   * @returns {Promise<Object>}                              The embed containing the help menu.
   */
  async buildHelp ({ description, supportServerInviteCode, color, prefixImage, version, page = 0 }) {
    page = parseInt(page)

    const fields = this._commands.reduce((fields, command) => {
      if (command.restricted) return fields

      const content = command.info
      const index = fields.length - 1

      if (fields[index] + content > 1024) fields.push(content)
      else fields[index] += (fields[index].length ? '\n' : '') + content

      return fields
    }, [''])
    if (this._replacers && this._replacers.length) {
      fields.push('**Replacers:**\n*Inserts live data values into commands. `|REPLACERNAME|`*\n\n' +
        this._replacers.reduce((a, r) => `${a}**${r.info}*\n`, ''))
    }
    if (this._reactCommands && this._reactCommands.length) {
      fields.push('**React Commands:**\n*React to any message with the appropriate reaction to trigger its command.*\n\n' +
        this._reactCommands.reduce((a, rC) => `${a}**${rC.info}*\n`, ''))
    }

    if (page >= fields.length) page = fields.length - 1
    if (page < 0) page = 0

    const embed = {
      title: '*[Click for support]* Made by ' + (await this._client.getOAuthApplication()).owner.username,
      description,
      url: 'https://discord.gg/' + supportServerInviteCode,
      color,
      footer: {
        icon_url: prefixImage,
        text: `Prefix: "${this._prefix}" or mention | <> = Mandatory () = Optional`
      },
      thumbnail: {
        url: this._client.user.dynamicAvatarURL('png')
      },
      author: {
        name: `${this._client.user.username} ${version} Help`,
        icon_url: helpIcon
      },
      fields: [
        {
          name: `Commands page ${page + 1} out of ${fields.length}`,
          value: fields[page]
        }
      ]
    }

    return embed
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
      .catch((err) => err.message.endsWith('already exists.') ? null : console.error(err))
      .finally(() => {
        for (const table of clearEmptyRows) {
          if (!tableNames.includes(table)) throw Error('Provided a non-existent table')
          const columns = tables.find((t) => t.name === table).columns.reduce((accum, column) => {
            if (column.default) accum[column.name] = column.default
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
   * @param   {Number}   interval How many milliseconds in between each call.
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
    return msg.channel.createMessage(`ERR:\n\`\`\`\n${err.message}\`\`\`${err.stack ? `\n\`\`\`\n${err.stack}\`\`\`` : ''}`)
      .catch(() => {
        console.error(err)
        return msg.channel.createMessage(`ERROR, SEND TO A BOT ADMIN: \`${Date.now()}\``)
      })
      .catch((err) => console.error('Error in error handler: ', err))
  }

  /**
   * Bind functions to events.
   * @private
   */
  _bindEvents () {
    this._client.on('ready', this._onReady.bind(this))
    this._client.on('error', this._onError.bind(this))
    this._client.on('messageCreate', this._onMessage.bind(this))
    if (this._fireOnEdit) this._client.on('messageUpdate', this._onMessage.bind(this))
    this._client.on('messageReactionAdd', this._onReaction.bind(this))
    if (this._fireOnReactionRemove) this._client.on('messageReactionRemove', this._onReaction.bind(this))
    this._client.on('shardReady', this._onShardReady.bind(this))
    this._client.on('shardDisconnect', this._onShardDisconnect.bind(this))
  }

  /**
   * What to do when a message is recived.
   * @private
   * @async
   * @param   {Eris.Message} msg The recieved message.
   */
  _onMessage (msg) {
    if (msg.author.bot) return

    if (this._commandHandler) {
      return this._commandHandler.handle(msg)
        .then((res) => {
          if (this._postMessageFunction) this._postMessageFunction(msg, res)
        })
        .catch((err) => this._handleError(err, msg))
    }
  }

  /**
   * What to do when a reaction is recieved.
   * @private
   * @async
   * @param   {Eris.Message} msg    The message reacted on.
   * @param   {Eris.Emoji}   emoji  The emoji used to react.
   * @param   {String}       userID The ID of the user who reacted.
   */
  _onReaction (msg, emoji, userID) {
    const user = this._client.users.get(userID)

    if (user.bot) return

    if (this._reactionHandler) {
      return this._reactionHandler.handle(msg, emoji, user)
        .catch((err) => this._handleError(err, msg))
    }
  }

  /**
   * What to do when the client's ready.
   * @private
   * @async
   * @param   {Eris.Client} client The Eris client.
   */
  async _onReady () {
    const ownerID = (await this._client.getOAuthApplication()).owner.id

    console.log('Initializing Command Handler')

    /**
     * The command handler for the bot.
     * @private
     * @type    {CommandHandler}
     */
    this._commandHandler = new _CommandHandler({
      agent: this,
      prefix: this._prefix,
      client: this._client,
      ownerID,
      knex: this._knex,
      commands: this._commands,
      replacers: this._replacers,
      options: {
        replacerBraces: this._replacerBraces,
        ignoreCodes
      }
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
        client: this._client,
        ownerID,
        knex: this._knex,
        reactCommands: this._reactCommands,
        options: {
          maxInterfaces: this._maxInterfaces,
          ignoreCodes
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
  _onShardReady (shard) {
    console.log(`Connected as ${this._client.user.username} on shard ${shard}`)

    if (this._statusMessage) {
      if (typeof this._statusMessage === 'function') this._statusMessage(this, shard, this._client.shards.get(shard).editStatus)
      else this._client.shards.get(shard).editStatus(this._statusMessage)
    } else {
      this._client.shards.get(shard).editStatus({
        name: `Prefix: '${this._prefix}'`,
        type: 2
      })
    }

    if (this._dblAPI) this._dblAPI.postStats(this._client.guilds.size, shard, this._client.shards.size).catch((err) => this._onError(this._client, err))
  }

  /**
   * What to do when a shard loses connection.
   * @private
   * @param   {Eris.Client} client The Eris client.
   * @param   {Eris.Shard}  shard  The disconnected shard.
   */
  _onShardDisconnect (shard) {
    console.log(`Shard ${shard} lost connection`)

    this.connect()
  }

  /**
   * What to do when an unknown error occurs.
   * @private
   * @param   {Eris.Client} client The Eris client.
   * @param   {Error}       error  The error.
   */
  _onError (error) {
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
