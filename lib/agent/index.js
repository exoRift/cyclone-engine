const {
  CommandHandler,
  ReactionHandler
} = require('../modules/')

const {
  IgnoredError
} = require('../errors/')

const helpIconURL = 'https://raw.githubusercontent.com/mets11rap/cyclone-engine/master/assets/Help Icon.png'

const ignoreCodes = require('./ignore-codes.json')

/**
 * The main controlling agent of the bot.
 */
class Agent {
  /**
   * Create an Agent.
   * @class
   * @param {Object}                       data                                               The agent data.
   * @prop  {Eris}                         data.Eris                                          The Eris class the system runs off of.
   * @prop  {String}                       data.token                                         The token to log in to the Discord API with.
   * @prop  {Object}                       [data.handlerData={}]                              The commands and replacers the bot will respond to as well as options for their handlers.
   * @prop  {Command[]}                    [data.handlerData.commands]                        The commands for the bot.
   * @prop  {ReactCommand[]}               [data.handlerData.reactCommands]                   The commands that trigger on reactions.
   * @prop  {Replacer[]}                   [data.handlerData.replacers]                       The replacers for the bot.
   * @prop  {Object}                       [data.handlerData.options={}]                      Options for the event handlers.
   * @prop  {String}                       [data.handlerData.options.prefix='!']              The prefix to execute commands.
   * @prop  {Object}                       [data.handlerData.options.replacerBraces]          The braces that invoke a replacer.
   * @prop  {String}                       [data.handlerData.options.replacerBraces.open='|'] The opening brace.
   * @prop  {String}                       [data.handlerData.options.replacerBraces.close]    The closing brace.
   * @prop  {Number}                       [data.handlerData.options.maxInterfaces=1500]      The maximum amount of reaction interfaces cached before they start getting deleted.
   * @prop  {Object}                       [data.agentOptions={}]                             Options for the agent.
   * @prop  {Number}                       [data.agentOptions.connectRetryLimit=10]           How many times the agent will attempt to establish a connection with Discord before giving up.
   * @prop  {Object|statusMessageFunction} [data.agentOptions.statusMessage]                  The status for the bot. It can be an object containing the data, or a callback function for each shard. By default, it's the bot's prefix.
   * @prop  {Object}                       [data.agentOptions.loopFunction={}]                A function that will run every loopInterval amount of ms, supplied the agent.
   * @prop  {function(Agent)}              data.agentOptions.loopFunction.func                The function.
   * @prop  {Number}                       [data.agentOptions.loopFunction.interval=30000]    The interval at which the loopFunction runs.
   * @prop  {Boolean}                      [data.agentOptions.fireOnEdit=false]               Whether the command handler is called when a command is edited or not.
   * @prop  {Boolean}                      [data.agentOptions.fireOnReactionRemove=false]     Whether the reaction handler is triggered on the removal of reactions as well.
   * @prop  {postMessageFunction}          [data.agentOptions.postMessageFunction]            A function that runs after every message whether it triggers a command or not.
   * @prop  {postReactionFunction}         [data.agentOptions.postReactionFunction]           A function that runs after every reaction whether it triggers a react command or not.
   * @prop  {String[]}                     [data.agentOptions.userBlacklist=[]]               An array of user IDs to be blacklisted from using the bot.
   */
  constructor ({ Eris, token, handlerData = {}, agentOptions = {} }) {
    const {
      commands,
      reactCommands,
      replacers,
      options: {
        prefix = '!',
        replacerBraces,
        maxInterfaces
      } = {}
    } = handlerData
    const {
      connectRetryLimit = 10,
      statusMessage,
      loopFunction: {
        func,
        interval = 300000
      } = {},
      fireOnEdit,
      fireOnReactionRemove,
      postMessageFunction,
      postReactionFunction,
      userBlacklist = []
    } = agentOptions
    /**
     * The Eris client.
     * @private
     * @type    {Eris.Client}
     */
    this._client = new Eris(token)

    /**
     * The commands and replacers the bot will respond to as well as options for their handlers.
     * @private
     * @type    {Object}
     * @prop    {Command[]}      commands                     The commands for the command handler.
     * @prop    {ReactCommand[]} reactCommands                The commands that trigger on reactions.
     * @prop    {Replacer[]}     replacers                    The replacers for the command handler.
     * @prop    {Object}         options                      The options for the handlers.
     * @prop    {String}         options.prefix               The prefix to execute commands.
     * @prop    {Object}         options.replacerBraces       The braces that invoke a replacer.
     * @prop    {String}         options.replacerBraces.open  The opening brace.
     * @prop    {String}         options.replacerBraces.close The closing brace.
     * @prop    {Number}         options.maxInterfaces        The maximum amount of interfaces cached before they start getting deleted.
     */
    this._handlerData = {
      commands,
      reactCommands,
      replacers,
      options: {
        prefix,
        replacerBraces,
        maxInterfaces
      }
    }

    /**
     * The options for the agent.
     * @private
     * @type    {Object}
     * @prop    {Number}                       connectRetryLimit    How many times the agent will attempt to establish a connection with Discord before giving up.
     * @prop    {Object|statusMessageFunction} statusMessage        The status for the bot. It can be an object containing the data, or a callback function for each shard. By default, it's the bot's prefix.
     * @prop    {Boolean}                      fireOnEdit           Whether the command handler is called when a command is edited or not.
     * @prop    {Boolean}                      fireOnReactionRemove Whether the reaction handler triggers on the removal of reactions.
     * @prop    {postMessageFunction}          postMessageFunction  A function that runs after every message whether it triggers a command or not.
     * @prop    {postReactionFunction}         postReactionFunction A function that runs after every reaction whether it triggers a react command or not.
     * @prop    {String[]}                     userBlacklist        An array of user IDs to be blacklisted from using the bot.
     */
    this._options = {
      connectRetryLimit,
      statusMessage,
      fireOnEdit,
      fireOnReactionRemove,
      postMessageFunction,
      postReactionFunction,
      userBlacklist
    }

    this._bindEvents()

    if (func) this._setLoop(func, interval)
  }

  /**
   * Connect to the Discord API. Will recursively retry this._connectRetryLimit number of times.
   * @param {Number} [_count=1] The current number of connection attempts. (Do not supply)
   */
  connect (_count = 1) {
    if (_count <= this._options.connectRetryLimit) {
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
   * @param     {Object}                         data                         The data for the menu.
   * @prop      {String}                         data.description             The description of the bot.
   * @prop      {String}                         data.supportServerInviteCode The invite code to the support server. (Note: This is the code, not the link)
   * @prop      {Number}                         data.color                   An integer color that changes the sidebar color of the embed.
   * @prop      {String}                         data.prefixImage             A link leading to an image of the prefix. This is displayed in the footer.
   * @prop      {String}                         data.version                 The version of the bot.
   * @prop      {Number}                         [page=1]                     The page of the help menu to load.
   * @yields    {Promise<buildHelpReturnObject>}                              An embed object containing the help menu.
   */
  async buildHelp ({ description, supportServerInviteCode, color, prefixImage, version }, page = 1) {
    page = parseInt(page)

    const pages = []
    if (this._handlerData.commands) pages.push(...this._compileInfo(this._handlerData.commands))
    if (this._handlerData.replacers) pages.push(...this._compileInfo(this._handlerData.replacers, '**Replacers:**\n*Inserts live data values into commands. `|REPLACERNAME|`*'))
    if (this._handlerData.reactCommands) pages.push(...this._compileInfo(this._handlerData.reactCommands, '**React Commands:**\n*React to any message with the appropriate reaction to trigger its command.*'))

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
        text: `Prefix: "${this._handlerData.options.prefix}" or mention | <> = Mandatory () = Optional # = Arg is a number`
      }
    }

    return {
      embed,
      pages
    }
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
      if (command.options.restricted) return info

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
   * Send or log an error message if it shouldn't be ignored.
   * @private
   * @param   {Error}             err         The error.
   * @param   {Eris.Message}      msg         The original message from Discord.
   * @param   {Number[]}          ignoreCodes A list of error codes where the error should be ignored.
   * @returns {Promise|undefined}
   */
  _handleError (err, msg, ignoreCodes) {
    if (ignoreCodes.includes(err.code) || err instanceof IgnoredError) return

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
    if (this._options.fireOnEdit) this._client.on('messageUpdate', this._onMessage.bind(this))
    this._client.on('messageReactionAdd', this._onReaction.bind(this))
    if (this._options.fireOnReactionRemove) this._client.on('messageReactionRemove', this._onReaction.bind(this))
    this._client.on('shardReady', this._onShardReady.bind(this))
    this._client.on('shardDisconnect', this._onShardDisconnect.bind(this))
  }

  /**
   * What to do when a message is recived.
   * @private
   * @async
   * @param   {Eris.Message} msg The recieved message.
   * @returns {Promise}
   */
  async _onMessage (msg) {
    if (msg.author.bot || this._options.userBlacklist.includes(msg.author.id)) return

    if (this._commandHandler) {
      return this._commandHandler.handle(msg)
        .then((res) => {
          if (this._options.postMessageFunction) this._options.postMessageFunction(msg, res)
        })
        .catch((err) => this._handleError(err, msg, ignoreCodes))
    }
  }

  /**
   * What to do when a reaction is recieved.
   * @private
   * @async
   * @param   {Eris.Message} msg    The message reacted on.
   * @param   {Eris.Emoji}   emoji  The emoji used to react.
   * @param   {String}       userID The ID of the user who reacted.
   * @returns {Promise}
   */
  async _onReaction (msg, emoji, userID) {
    const user = this._client.users.get(userID)

    if (user.bot || this._options.userBlacklist.includes(user.id)) return

    if (this._reactionHandler) {
      return this._reactionHandler.handle(msg, emoji, user)
        .then((res) => {
          if (this._options.postReactionFunction) this._options.postReactionFunction(msg, emoji, user, res)
        })
        .catch((err) => this._handleError(err, msg, ignoreCodes))
    }
  }

  /**
   * What to do when the client's ready.
   * @private
   * @returns {Promise}
   */
  _onReady () {
    return this._client.getOAuthApplication()
      .then((app) => {
        const ownerID = app.owner.id

        if (this._handlerData.commands) {
          console.log('Initializing Command Handler')

          /**
           * The command handler for the bot.
           * @private
           * @type    {CommandHandler}
           */
          this._commandHandler = new CommandHandler({
            agent: this,
            client: this._client,
            ownerID,
            commands: this._handlerData.commands,
            replacers: this._handlerData.replacers,
            options: {
              replacerBraces: this._handlerData.options.replacerBraces,
              prefix: this._handlerData.options.prefix
            }
          })
        }

        if (this._handlerData.reactCommands) {
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
            reactCommands: this._handlerData.reactCommands,
            options: {
              maxInterfaces: this._handlerData.options.maxInterfaces
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

    if (this._options.statusMessage) {
      if (typeof this._options.statusMessage === 'function') this._options.statusMessage(shard.editStatus.bind(shard), this, shardID)
      else {
        shard.editStatus({
          name: this._options.statusMessage
        })
      }
    } else {
      shard.editStatus({
        name: `Prefix: '${this._handlerData.options.prefix}'`,
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

/**
 * An object returned by the agent's buildHelp method.
 * @typedef {Object}   buildHelpReturnObject
 * @prop    {Object}   embed                 The resulting help menu in a Discord embed format.
 * @prop    {String[]} pages                 The pages of the help menu. Only one is displayed in the embed and it's chosen by the page parameter. (It's standard practice to build a new help menu for every command initiation, however.)
 */
