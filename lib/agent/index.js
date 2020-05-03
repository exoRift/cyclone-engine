const {
  CommandHandler,
  ReactionHandler
} = require('../modules/')

const helpIconURL = 'https://raw.githubusercontent.com/mets11rap/cyclone-engine/master/assets/Help Icon.png'

const ignoreCodes = [
  50013,
  50001
]

/**
 * The main controlling agent of the bot.
 */
class Agent {
  /**
   * Create an Agent.
   * @class
   * @param {Object}                       data                                            The agent data.
   * @prop  {Eris}                         data.Eris                                       The Eris class the system runs off of.
   * @prop  {String}                       data.token                                      The token to log in to the Discord API with.
   * @prop  {Object}                       [data.handlerData={}]                           The commands and replacers the bot will respond to
   * @prop  {Command[]}                    [data.handlerData.commands]                     The commands for the bot.
   * @prop  {Replacer[]}                   [data.handlerData.replacers]                    The replacers for the bot.
   * @prop  {ReactCommand[]}               [data.handlerData.reactCommands]                The commands that trigger on reactions.
   * @prop  {Object}                       [data.handlerData.replacerBraces]               The braces that invoke a replacer.
   * @prop  {String}                       [data.handlerData.replacerBraces.open='|']      The opening brace.
   * @prop  {String}                       [data.handlerData.replacerBraces.close]         The closing brace.
   * @prop  {Object}                       [data.agentOptions={}]                          Options for the agent.
   * @prop  {Number}                       [data.agentOptions.connectRetryLimit=10]        How many times the agent will attempt to establish a connection with Discord before giving up.
   * @prop  {String}                       [data.agentOptions.prefix='!']                  The prefix for bot commands.
   * @prop  {Object|statusMessageFunction} [data.agentOptions.statusMessage]               The status for the bot. It can be an object containing the data, or a callback function for each shard. By default, it's the bot's prefix.
   * @prop  {Object}                       [data.agentOptions.loopFunction={}]             A function that will run every loopInterval amount of ms, supplied the agent.
   * @prop  {function(Agent)}              data.agentOptions.loopFunction.func             The function.
   * @prop  {Number}                       [data.agentOptions.loopFunction.interval=30000] The interval at which the loopFunction runs.
   * @prop  {Boolean}                      [data.agentOptions.fireOnEdit=false]            Whether the command handler is called when a command is edited or not.
   * @prop  {Boolean}                      [data.agentOptions.fireOnReactionRemove=false]  Whether the reaction handler is triggered on the removal of reactions as well.
   * @prop  {postMessageFunction}          [data.agentOptions.postMessageFunction]         A function that runs after every message whether it triggers a command or not.
   * @prop  {postReactionFunction}         [data.agentOptions.postReactionFunction]        A function that runs after every reaction whether it triggers a react command or not.
   * @prop  {Number}                       [data.agentOptions.maxInterfaces=1500]          The maximum amount of reaction interfaces cached before they start getting deleted.
   * @prop  {String[]}                     [data.agentOptions.userBlacklist=[]]            An array of user IDs to be blacklisted from using the bot.
   */
  constructor ({ Eris, token, handlerData = {}, agentOptions = {} }) {
    const {
      commands,
      replacers,
      replacerBraces,
      reactCommands
    } = handlerData
    const {
      connectRetryLimit = 10,
      prefix = '!',
      statusMessage,
      loopFunction: {
        func,
        interval = 300000
      } = {},
      fireOnEdit,
      postMessageFunction,
      postReactionFunction,
      fireOnReactionRemove,
      maxInterfaces,
      userBlacklist = []
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
     * @type    {Object|statusMessageFunction}
     */
    this._statusMessage = statusMessage

    /**
     * Whether the command handler is called when a command is edited or not.
     * @private
     * @type    {Boolean}
     */
    this._fireOnEdit = fireOnEdit

    /**
     * A function that runs after every message whether it triggers a command or not.
     * @private
     * @type    {postMessageFunction}
     */
    this._postMessageFunction = postMessageFunction

    /**
     * A function that runs after every reaction whether it triggers a react command or not.
     * @private
     * @type    {postReactionFunction}
     */
    this._postReactionFunction = postReactionFunction

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

    /**
     * An array of user IDs to be blacklisted from using the bot.
     * @private
     * @type    {String[]}
     */
    this._userBlacklist = userBlacklist

    this._bindEvents()

    if (func) this._setLoop(func, interval)
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
   * @param   {Eris.Channel} channel The ID of the channel to pick your last message from.
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
   * @generator
   * @param     {Object}          data                         The data for the menu
   * @prop      {String}          data.description             The description of the bot
   * @prop      {String}          data.supportServerInviteCode The invite code to the support server. (Note: This is the code, not the link)
   * @prop      {Number}          data.color                   An integer color that changes the sidebar color of the embed.
   * @prop      {String}          data.prefixImage             A link leading to an image of the prefix. This is displayed in the footer.
   * @prop      {String}          data.version                 The version of the bot.
   * @prop      {Number}          [data.page=1]                The page of the help menu to load.
   * @yields    {Promise<Object>}                              An embed object containing the help menu.
   */
  async buildHelp ({ description, supportServerInviteCode, color, prefixImage, version, page = 1 }) {
    page = parseInt(page)

    const pages = []
    if (this._commands) pages.push(...this._compileInfo(this._commands))
    if (this._replacers) pages.push(...this._compileInfo(this._replacers, '**Replacers:**\n*Inserts live data values into commands. `|REPLACERNAME|`*'))
    if (this._reactCommands) pages.push(...this._compileInfo(this._reactCommands, '**React Commands:**\n*React to any message with the appropriate reaction to trigger its command.*'))

    if (page > pages.length) page = pages.length
    if (page < 1) page = 1

    const embed = {
      author: {
        name: `${this._client.user.username} ${version} Help`,
        icon_url: helpIconURL
      },
      title: '*[Click for support]* Made by ' + (await this._client.getOAuthApplication()).owner.username,
      url: 'https://discord.gg/' + supportServerInviteCode,
      description,
      thumbnail: {
        url: this._client.user.dynamicAvatarURL('png')
      },
      color,
      fields: [
        {
          name: `Commands page ${page} out of ${pages.length}`,
          value: pages[page - 1]
        }
      ],
      footer: {
        icon_url: prefixImage,
        text: `Prefix: "${this._prefix}" or mention | <> = Mandatory () = Optional # = Arg is a number`
      }
    }

    return embed
  }

  /**
   * Compile command info into a list.
   * @private
   * @param   {Command[]|Command|Replacer[]|Replacer|ReactCommand[]|ReactCommand} items  The items to compile.
   * @param   {String}                                                            header The header of the content.
   * @returns {String[]}                                                                 The resulting fields sent in a Discord embed.
   */
  _compileInfo (items, header) {
    if (!Array.isArray(items)) items = [items]
    header = header ? `${header}\n` : ''

    const content = items.reduce((info, command) => {
      if (command.restricted) return info

      const content = command.info
      const index = info.length - 1
      const newline = info[index].length ? '\n' : ''

      if ((info[index] + newline + content).length > 1024) info.push(content)
      else info[index] += newline + content

      return info
    }, [header])

    if (content[0] === header) return []

    return content
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
    if (msg.author.bot || this._userBlacklist.includes(msg.author.id)) return

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

    if (user.bot || this._userBlacklist.includes(user.id)) return

    if (this._reactionHandler) {
      return this._reactionHandler.handle(msg, emoji, user)
        .then((res) => {
          if (this._postReactionFunction) this._postReactionFunction(msg, emoji, user, res)
        })
        .catch((err) => this._handleError(err, msg))
    }
  }

  /**
   * What to do when the client's ready.
   * @private
   * @async
   */
  _onReady () {
    return this._client.getOAuthApplication()
      .then((app) => {
        const ownerID = app.owner.id

        if (this._commands) {
          console.log('Initializing Command Handler')

          /**
           * The command handler for the bot.
           * @private
           * @type    {CommandHandler}
           */
          this._commandHandler = new CommandHandler({
            agent: this,
            prefix: this._prefix,
            client: this._client,
            ownerID,
            commands: this._commands,
            replacers: this._replacers,
            options: {
              replacerBraces: this._replacerBraces,
              ignoreCodes
            }
          })
        }

        if (this._reactCommands) {
          console.log('Initializing Reaction Handler')

          /**
           * The reaction handler for the bot.
           * @private
           * @type    {ReactionHandler}
           */
          this._reactionHandler = new ReactionHandler({
            agent: this,
            client: this._client,
            ownerID,
            reactCommands: this._reactCommands,
            options: {
              maxInterfaces: this._maxInterfaces,
              ignoreCodes
            }
          })
        }
      })
      .catch(this._onError)
  }

  /**
   * What to do when a shard is ready.
   * @private
   * @param   {Number} shardID The ID of the shard that's ready.
   */
  _onShardReady (shardID) {
    const shard = this._client.shards.get(shardID)

    console.log(`Connected as ${this._client.user.username} on shard ${shardID}`)

    if (this._statusMessage) {
      if (typeof this._statusMessage === 'function') this._statusMessage(shard.editStatus.bind(shard), this, shardID)
      else {
        shard.editStatus({
          name: this._statusMessage
        })
      }
    } else {
      shard.editStatus({
        name: `Prefix: '${this._prefix}'`,
        type: 2
      })
    }
  }

  /**
   * What to do when a shard loses connection.
   * @private
   * @param   {Error}      err   The error
   * @param   {Eris.Shard} shard The disconnected shard.
   */
  _onShardDisconnect (err, shard) {
    console.log(`Shard ${shard} lost connection. Error:\n${err}`)

    this.connect()
  }

  /**
   * What to do when an unknown error occurs.
   * @private
   * @param   {Eris.Client} client The Eris client.
   * @param   {Error}       error  The error.
   */
  _onError (error) {
    console.error('An error has occured:', error)
  }
}

module.exports = Agent

/**
 * The status for the bot. It's a callback function for each shard.
 * @callback                         statusMessageFunction
 * @param    {Eris.Shard.editStatus} editStatus            The setStatus function from the Eris client.
 * @param    {Agent}                 agent                 The agent.
 * @param    {Number}                shard                 The Eris shard the status is being applied to.
 */

/**
 * A function that runs after every message whether it triggers a command or not.
 * @callback                         postMessageFunction
 * @param    {Eris.Message}          msg                 The message that triggered the command.
 * @param    {CommandHandlerResults} results             The results of the command.
 */

/**
 * A function that runs after every reaction whether it triggers a react command or not.
 * @callback                          postReactionFunction
 * @param    {Eris.Message}           msg                  The message reacted on.
 * @param    {Object}                 emoji                The data of the emoji reacted with.
 * @param    {Eris.User}              user                 The user who reacted.
 * @param    {ReactionHandlerResults} results              The results of the react command.
 */
