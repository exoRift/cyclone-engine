const {
  IgnoredError,
  InputError
} = require('../errors/')

const {
  CommandHandler,
  ReactionHandler
} = require('../modules/')

const {
  ReactCommand,
  ReactInterface
} = require('../structures/')

/**
 * The main controlling agent of the bot
 */
class Agent {
  /**
   * Create an Agent
   * @class
   * @param {Object}                       data                                               The agent data
   * @prop  {Eris}                         data.Eris                                          The Eris class the system runs off of
   * @prop  {String}                       data.token                                         The token to log in to the Discord API with
   * @prop  {Object}                       [data.handlerData={}]                              The commands and replacers the bot will respond to as well as options for their handlers
   * @prop  {Command[]|Command}            [data.handlerData.commands]                        The commands for the bot
   * @prop  {ReactCommand[]|ReactCommand}  [data.handlerData.reactCommands]                   The commands that trigger on reactions
   * @prop  {Replacer[]|Replacer}          [data.handlerData.replacers]                       The replacers for the bot
   * @prop  {Object}                       [data.handlerData.options={}]                      Options for the event handlers
   * @prop  {String}                       [data.handlerData.options.prefix='!']              The prefix to execute commands
   * @prop  {Object}                       [data.handlerData.options.replacerBraces]          The braces that invoke a replacer
   * @prop  {String}                       [data.handlerData.options.replacerBraces.open='|'] The opening brace
   * @prop  {String}                       [data.handlerData.options.replacerBraces.close]    The closing brace
   * @prop  {Number}                       [data.handlerData.options.maxInterfaces=1500]      The maximum amount of reaction interfaces cached before they start getting deleted
   * @prop  {Object}                       [data.options={}]                                  Options for the agent
   * @prop  {String[]}                     [data.options.intents=[]]                          Additional intents to subscribe to for the gateway. (Intents are automatically calculated from agent features getting enabled. However, add additional intents if needed)
   * @prop  {GuildData|Promise<GuildData>} [data.options.guildOptions={}]                     Options for specific guilds (Usually initially loaded from a database)
   * @prop  {Object|StatusMessageFunction} [data.options.statusMessage]                       The status for the bot. It can be an object containing the data, or a callback function for each shard. By default, it's the bot's prefix
   * @prop  {Boolean}                      [data.options.fireOnEdit=false]                    Whether the command handler is called when a command is edited or not
   * @prop  {Boolean}                      [data.options.fireOnReactionRemove=false]          Whether the reaction handler is triggered on the removal of reactions as well
   * @prop  {Object}                       [data.options.postEventFunctions={}]               A collection of functions to run after an event is triggered
   * @prop  {PostMessageFunction}          [data.options.postEventFunctions.message]          A function that runs after every message whether it triggers a command or not
   * @prop  {PostReactionFunction}         [data.options.postEventFunctions.reaction]         A function that runs after every reaction whether it triggers a react command or not
   * @prop  {PostPermissionFunction}       [data.options.postEventFunctions.permission]       A function that runs after a permission is changed
   * @prop  {PostPrefixFunction}           [data.options.postEventFunctions.prefix]           A function that runs after a guild prefix is changed
   * @prop  {Object}                       [data.options.erisOptions={}]                      A passthrough for additional Eris options. (Does not override intents, supply additional intents to `options.intents`)
   */
  constructor ({ Eris, token, handlerData = {}, options = {} }) {
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
      intents = [],
      guildOptions = {},
      statusMessage,
      fireOnEdit = false,
      fireOnReactionRemove = false,
      postEventFunctions: {
        message: messageEvent,
        reaction: reactionEvent,
        permission: permissionEvent,
        prefix: prefixEvent
      } = {},
      erisOptions = {}
    } = options

    const baseIntents = [
      'MESSAGE_CREATE',
      'MESSAGE_UPDATE',
      'MESSAGE_DELETE'
    ]

    if (reactCommands) baseIntents.push('MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE')

    /**
     * URLs to assets used internally
     * @private
     * @type    {Object}
     * @prop    {String} help The help icon
     */
    this._assetURLs = {
      help: 'https://raw.githubusercontent.com/exoRift/cyclone-engine/master/assets/Help%20Icon.png'
    }

    /**
     * Descriptions for argument types
     * @private
     * @type    {Object}
     */
    this._argTypeDescs = {
      string: 'Regular text',
      number: 'An integer or decimal',
      user: 'A user mention or part of a username',
      channel: 'A channel mention or part of a channel name'
    }

    /**
     * The Eris class
     * @private
     * @type    {Class}
     */
    this._Eris = Eris

    /**
     * The Eris client
     * @type {Eris.Client}
     */
    this.client = new Eris(token, {
      ...erisOptions,
      intents: baseIntents.concat(intents)
    })

    /**
     * The commands and replacers the bot will respond to as well as options for their handlers
     * @private
     * @type    {Object}
     * @prop    {Command[]}      commands                     The commands for the command handler
     * @prop    {ReactCommand[]} reactCommands                The commands that trigger on reactions
     * @prop    {Replacer[]}     replacers                    The replacers for the command handler
     * @prop    {Object}         options                      The options for the handlers
     * @prop    {String}         options.prefix               The prefix to execute commands
     * @prop    {Object}         options.replacerBraces       The braces that invoke a replacer
     * @prop    {String}         options.replacerBraces.open  The opening brace
     * @prop    {String}         options.replacerBraces.close The closing brace
     * @prop    {Number}         options.maxInterfaces        The maximum amount of interfaces cached before they start getting deleted
     */
    this._handlerData = {
      commands: this._toArray(commands),
      reactCommands: this._toArray(reactCommands),
      replacers: this._toArray(replacers),
      options: {
        prefix,
        replacerBraces,
        maxInterfaces
      }
    }

    /**
     * The options for the agent
     * @private
     * @type    {Object}
     * @prop    {Object|StatusMessageFunction} statusMessage                 The status for the bot. It can be an object containing the data, or a callback function for each shard. By default, it's the bot's prefix
     * @prop    {Boolean}                      fireOnEdit                    Whether the command handler is called when a command is edited or not
     * @prop    {Boolean}                      fireOnReactionRemove          Whether the reaction handler triggers on the removal of reactions
     * @prop    {Object}                       postEventFunctions            A collection of functions to run after an event is triggered.
     * @prop    {PostMessageFunction}          postEventFunctions.message    A function that runs after every message whether it triggers a command or not
     * @prop    {PostReactionFunction}         postEventFunctions.reaction   A function that runs after every reaction whether it triggers a react command or not
     * @prop    {PostPermissionFunction}       postEventFunctions.permission A function that runs after a permission is changed
     * @prop    {PostPrefixFunction}           postEventFunctions.prefix     A function that runs after a guild prefix is changed
     */
    this._options = {
      statusMessage,
      fireOnEdit,
      fireOnReactionRemove,
      postEventFunctions: {
        message: messageEvent,
        reaction: reactionEvent,
        permission: permissionEvent,
        prefix: prefixEvent
      }
    }

    /**
     * Guild specific data
     * @private
     * @type   {GuildData}
     */
    this._guildData = guildOptions instanceof Promise ? {} : guildOptions

    if (guildOptions instanceof Promise) this._awaitGuildOptions(guildOptions)

    /**
     * User-supplied data that is passed to commands
     * @type {Object}
     */
    this.attachments = {}

    /**
     * A cache for the `buildHelp` method
     * @private
     * @type    {String[]}
     */
    this._helpCache = []

    /**
     * Middleware to run during command processing
     * @private
     * @type    {Middleware[]}
     */
    this._middleware = [
      this._checkPermissions.bind(this)
    ]

    this._bindBaseEvents()
  }

  /**
   * Add an attachment that is passed to commands
   * @param   {String} name  The name of the attachment
   * @param   {*}      value The value of the attachment
   * @returns {Object}       All added attachments
   */
  attach (name, value) {
    if (this.attachments[name]) throw Error('An attachment with that name is already added')

    this.attachments[name] = value

    return this.attachments
  }

  /**
   * Wait for guild options to be asynchronous supplied
   * @private
   * @async
   * @param   {Promise<GuildData>} guildOptions The promise returning the data
   */
  async _awaitGuildOptions (guildOptions) {
    const options = await guildOptions

    this._guildData = options
  }

  /**
   * Bind actions to base events
   * @private
   */
  _bindBaseEvents () {
    this.client.on('error', this._onError.bind(this))

    this.client.on('shardReady', this._onShardReady.bind(this))
    this.client.on('shardDisconnect', this._onShardDisconnect.bind(this))
  }

  /**
   * Bind actions to events that require handlers
   * @private
   */
  _bindHandlerEvents () {
    if (this._handlerData.commands) {
      this.client.on('messageCreate', this._onMessage.bind(this))
      if (this._options.fireOnEdit) this.client.on('messageUpdate', this._onMessage.bind(this))
    }

    if (this._handlerData.reactCommands) {
      this.client.on('messageReactionAdd', this._onReaction.bind(this))
      if (this._options.fireOnReactionRemove) this.client.on('messageReactionRemove', this._onReaction.bind(this))
    }
  }

  /**
   * Build a guide embed for a specific command (Does not work for replacers or react commands)
   * @generator
   * @param    {String} name The name of the command
   * @yields   {Object}      The guide embed
   */
  buildCommandGuide (name) {
    const command = this._handlerData.commands.find((c) => c.name === name.toLowerCase() || c.options.aliases.includes(name.toLowerCase()))

    if (!command) throw Error(`Could not find a command named \`${name}\``)

    const accessMsg = command.options.restricted
      ? 'This command is restricted to the bot owner only'
      : command.options.authLevel
        ? `*This command requires an authority level of ${command.options.authLevel}*`
        : 'This command is available to everyone'

    const fields = [{
      name: accessMsg,
      value: `__${' '.repeat(accessMsg.length)}\u200b__` // Divider
    }]

    if (command.options.args.length) {
      const args = command.options.args
        .reduce((acc, arg) => `${acc}${acc ? '\n' : ''}**${arg.name}** {${arg.mand ? 'Mandatory' : 'Optional'}} - *${this._argTypeDescs[arg.type]}*`, '')

      fields.unshift({
        name: 'Arguments',
        value: args
      })
    }

    return {
      author: {
        name: 'Command Guide',
        icon_url: this._assetURLs.help
      },
      title: command.options.aliases.reduce((acc, alias) => `${acc}/${alias}`, command.name),
      description: `*${command.desc}*`,
      color: command.options.guide.color,
      fields: fields.concat(command.options.guide.fields)
    }
  }

  /**
   * Build a help menu and compile command info (Does not update with commands added after the agent has been constructed)
   * @generator
   * @param     {Object}                [data]             The data for the menu
   * @prop      {String}                [data.desc]        The description of the bot
   * @prop      {String}                [data.serverCode]  The invite code to the bot's server (Note: This is the code, not the link)
   * @prop      {Number}                [data.color=33023] An integer color that changes the sidebar color of the embed
   * @prop      {String}                [data.footerImage] A link leading to an image for the footer (An image of the prefix recommended)
   * @prop      {String}                [data.version]     The version of the bot
   * @param     {Number}                [page=1]           The page of the help menu to load
   * @yields    {BuildHelpReturnObject}                    An object containing help menu data
   */
  buildHelp (data, page = 1) {
    if (data && !this.app) throw Error('Could not get OAuth app info. Please start the bot with `Agent.connect()`')

    let embed
    let reactInterface
    let pages = []

    if (this._helpCache.length) pages = [...this._helpCache]
    else {
      if (this._handlerData.commands) pages.push(...this._compileInfo(this._handlerData.commands))
      if (this._handlerData.replacers) pages.push(...this._compileInfo(this._handlerData.replacers, '**Replacers:**\n*Inserts live data values into commands. `|REPLACERNAME|`*'))
      if (this._handlerData.reactCommands) pages.push(...this._compileInfo(this._handlerData.reactCommands, '**React Commands:**\n*React to any message with the appropriate reaction to trigger its command.*'))

      this._helpCache = [
        ...pages
      ]
    }

    if (data) {
      const {
        desc,
        serverCode,
        color = 33023, // Cyclone blue
        footerImage,
        version
      } = data

      page = parseInt(page) || page
      if (page > pages.length) page = pages.length
      if (page < 1) page = 1

      embed = {
        author: {
          name: `${this.client.user.username} ${version ? `v${version} ` : ''}Help`,
          icon_url: this._assetURLs.help
        },
        title: `${serverCode ? '*[Click for support]* ' : ''}Made by ${this.app.owner.username}`,
        url: serverCode ? 'https://discord.gg/' + serverCode : undefined,
        description: desc,
        thumbnail: {
          url: this.client.user.dynamicAvatarURL('png')
        },
        color,
        fields: [
          {
            name: `Commands page ${page} out of ${pages.length}`,
            value: pages[page - 1]
          }
        ],
        footer: {
          icon_url: footerImage,
          text: `Prefix: "${this._handlerData.options.prefix}" or mention | <> = Mandatory () = Optional | # = Number / @ = User / [#] = Channel`
        }
      }

      if (pages.length > 1) {
        reactInterface = new ReactInterface({
          buttons: [
            new ReactCommand({
              emoji: '\u21A9', // Left arrow
              action: ({ msg }) => {
                if (page > 1) page--

                msg.edit({
                  embed: {
                    ...embed,
                    fields: [
                      {
                        name: `Commands page ${page} out of ${pages.length}`,
                        value: pages[page - 1]
                      }
                    ]
                  }
                })
              }
            }),
            new ReactCommand({
              emoji: '\u21AA', // Right arrow
              action: ({ msg }) => {
                if (page < pages.length) page++

                msg.edit({
                  embed: {
                    ...embed,
                    fields: [
                      {
                        name: `Commands page ${page} out of ${pages.length}`,
                        value: pages[page - 1]
                      }
                    ]
                  }
                })
              }
            })
          ]
        })
      }
    }

    return {
      embed,
      options: {
        reactInterface
      },
      pages
    }
  }

  /**
   * Check if a user has the sufficient permissions to use a command
   * @param  {Eris.Message}         msg     The message
   * @param  {Eris.Member}          member  The subject member of the guild
   * @param  {Command|ReactCommand} command The command
   * @throws {InputError}
   */
  _checkPermissions (msg, member, command) {
    if (!msg.channel.type && command.options.authLevel && this._guildData[member.guild.id] && this._guildData[member.guild.id].permissions) {
      const level = this.getTopPermissionLevel(member)

      if (level < command.options.authLevel) throw new InputError('This command required a minimum level of ' + command.options.authLevel, 'Your top level is ' + level, 'nopermission')
    }
  }

  /**
   * Compile command info into a list
   * @private
   * @param   {Command[]|Command|Replacer[]|Replacer|ReactCommand[]|ReactCommand} items    The items to compile
   * @param   {String}                                                            [header] The header of the content
   * @returns {String[]}                                                                   The resulting info pages
   */
  _compileInfo (items, header) {
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
    else return content
  }

  /**
   * Compile Knex-like guild data format to the Agent's native format
   * @param   {Object[]}       dbData                  The data from the database
   * @prop    {String}         dbData.id               The ID of the guild
   * @prop    {PermissionList} [dbData.permissions={}] The authority level of the roles of the guild
   * @prop    {String}         [dbData.prefix]         The custom server-side prefix
   * @returns {GuildData}                               A formatted guild data object
   */
  compileGuildSQL (dbData) {
    if (!Array.isArray(dbData)) throw TypeError('Supplied database data is not an array')

    const compiled = {}

    for (const guild of dbData) {
      compiled[guild.id] = {
        permissions: guild.permissions || {},
        prefix: guild.prefix
      }
    }

    return compiled
  }

  /**
   * Connect to the Discord API and initiate event handlers.
   * @returns {Promise<void>}
   */
  connect () {
    return this.client.connect()
      .then(() => this._getApp())
      .then(() => this._initHandlers())
      .then(() => this._bindHandlerEvents())
      .catch(this._onError)
  }

  /**
   * Remove an attachment
   * @param   {String} name The name of the attachment to remove
   * @returns {*}           The value of the removed attachment
   */
  detach (name) {
    const attachment = this.attachments[name]

    delete this.attachments[name]

    return attachment
  }

  /**
   * Format data by turning existing single supply into arrays if necessary
   * @private
   * @param   {*|Array<*>} data The data
   * @returns {*|Array<*>}        The formatted data
   */
  _toArray (data) {
    if (data !== undefined && data !== null) return Array.isArray(data) ? data : [data]
  }

  /**
   * Format guild data for command handler prefixes
   * @private
   * @param   {GuilData} data The data
   * @returns {Object}        Returns an object where guild IDs are mapped to prefixes
   */
  _formatPrefixesForHandler (data) {
    const formatted = {}

    for (const guild in data) formatted[guild] = data[guild].prefix

    return formatted
  }

  /**
   * Get the bot's app data and store it in `this.app`
   * @private
   * @returns {Promise<Object>} The app data
   */
  _getApp () {
    return this.client.getOAuthApplication()
      .then((app) => {
        /**
         * The Discord app of the bot
         * @type {Object}
         */
        this.app = app

        return app
      })
      .catch(this._onError)
  }

  /**
   * Get a guild member's top authority level role
   * @param   {Eris.Member} user The member of the guild. (Do not provide an Eris User instance, it must be a Member)
   * @returns {Number}           The leading authority level
   */
  getTopPermissionLevel (user) {
    if (!(user instanceof this._Eris.Member)) throw Error('Provided user is not a Member instance. (Did you provide a User instance instead?)')

    if (user.guild.owner === user.id) return Infinity

    return user.roles.reduce((a, r) => (this._guildData[user.guild.id] && this._guildData[user.guild.id].permissions && this._guildData[user.guild.id].permissions[r] > a) ? this._guildData[user.guild.id].permissions[r] : a, 0)
  }

  /**
   * Send or log an error message if it's not an IgnoredError instance
   * @private
   * @param   {Error}                 err The error
   * @param   {Eris.Message}          msg The original message from Discord
   * @returns {Promise<Message|void>}
   */
  async _handleError (err, msg) {
    if (err instanceof IgnoredError) return

    return msg.channel.createMessage(`ERR:\n\`\`\`\n${err.message}\`\`\`${err.stack ? `\n\`\`\`\n${err.stack}\`\`\`` : ''}`)
      .catch(() => {
        console.error(err)

        return msg.channel.createMessage(`ERROR, SEND TO A BOT ADMIN: \`${Date.now()}\``)
      })
      .catch((err) => console.error('Error in error handler: ', err))
  }

  /**
   * Initiate the event handlers
   * @private
   */
  _initHandlers () {
    if (this._handlerData.commands) {
      console.log('Initializing Command Handler')

      /**
       * The command handler for the bot
       * @type {CommandHandler}
       */
      this.commandHandler = new CommandHandler({
        agent: this,
        client: this.client,
        commands: this._handlerData.commands,
        replacers: this._handlerData.replacers,
        options: {
          prefix: this._handlerData.options.prefix,
          replacerBraces: this._handlerData.options.replacerBraces,
          guildPrefixes: this._formatPrefixesForHandler(this._guildData),
          _app: this.app
        }
      })
    }

    if (this._handlerData.reactCommands) {
      console.log('Initializing Reaction Handler')

      /**
       * The reaction handler for the bot
       * @type {ReactionHandler}
       */
      this.reactionHandler = new ReactionHandler({
        agent: this,
        client: this.client,
        ownerID: this.app.owner.id,
        reactCommands: this._handlerData.reactCommands,
        options: {
          maxInterfaces: this._handlerData.options.maxInterfaces,
          _app: this.app
        }
      })
    }
  }

  /**
   * Get the last message sent by the bot in a given channel
   * @param   {Eris.Channel} channel The ID of the channel to pick your last message from
   * @returns {Eris.Message}         The last message
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
   * What to do when an unknown error occurs
   * @private
   * @param   {Error} error  The error
   */
  _onError (error) {
    console.error('An error has occured:', error)
  }

  /**
   * What to do when a message is recived
   * @private
   * @async
   * @param   {Eris.Message}  msg The recieved message
   * @returns {Promise<void>}
   */
  async _onMessage (msg) {
    if (msg.author.bot) return

    return this.commandHandler.handle(msg)
      .then((res) => {
        if (this._options.postEventFunctions.message) this._options.postEventFunctions.message(msg, res)

        return res
      })
      .catch((err) => this._handleError(err, msg))
  }

  /**
   * What to do when a reaction is recieved
   * @private
   * @async
   * @param   {Eris.Message}  msg    The message reacted on
   * @param   {Eris.Emoji}    emoji  The emoji used to react
   * @param   {String}        userID The ID of the user who reacted
   * @returns {Promise<void>}
   */
  async _onReaction (msg, emoji, userID) {
    const user = this.client.users.get(userID)

    if (user.bot) return

    return this.reactionHandler.handle(msg, emoji, user)
      .then((res) => {
        if (this._options.postEventFunctions.reaction) this._options.postEventFunctions.reaction(msg, emoji, user, res)

        return res
      })
      .catch((err) => this._handleError(err, msg))
  }

  /**
   * What to do when a shard loses connection
   * @private
   * @param   {Error}      err   The error
   * @param   {Eris.Shard} shard The disconnected shard
   */
  _onShardDisconnect (err, shard) {
    console.log(`Shard ${shard} lost connection. Error:\n${err}`)
  }

  /**
   * What to do when a shard is ready
   * @private
   * @param   {Number} shardID The ID of the shard that's ready
   */
  _onShardReady (shardID) {
    const shard = this.client.shards.get(shardID)

    console.log(`Connected as ${this.client.user.username} on shard ${shardID}`)

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
   * Resets the help menu cache
   */
  resetHelpCache () {
    this._helpCache = []
  }

  /**
   * Set a server's custom prefix
   * @param {String} guild  The ID of the guild
   * @param {String} prefix The custom prefix
   */
  setGuildPrefix (guild, prefix) {
    if (!this._guildData[guild]) this._guildData[guild] = {}

    const oldPrefix = this._guildData[guild].prefix

    this._guildData[guild].prefix = prefix

    if (this._options.postEventFunctions.prefix) this._options.postEventFunctions.prefix(guild, prefix, oldPrefix)

    if (this.commandHandler) this.commandHandler.setGuildPrefix(guild, prefix)
  }

  /**
   * Update the permission level of a guild role
   * @param   {String} guild The ID of the guild
   * @param   {String} role  The role to modify
   * @param   {Number} level The permission level to set the role to
   * @returns {Object}       All current permissions of the guild
   */
  updatePermission (guild, role, level) {
    if (!this.client.guilds.has(guild)) throw Error('An ID to a guild the bot isn\'t in was provided. ID: ' + guild)
    if (!this.client.guilds.get(guild).roles.has(role)) throw Error('An ID to a role that doesn\'t exist was provided. ID: ' + role)

    const parsedLevel = parseInt(level)
    if (isNaN(parsedLevel)) throw Error(`'${level}' is not a valid level. A level must be a valid integer`)

    if (this._guildData[guild] && this._guildData[guild].permissions) {
      if (Object.entries(this._guildData[guild].permissions).find((p) => p[0] !== role && p[1] === parsedLevel)) console.log(`WARNING: Multiple roles in guild '${guild}' have been assigned level ${level}`)
    } else {
      this._guildData[guild] = {
        permissions: {}
      }
    }

    const oldLevel = this._guildData[guild].permissions[role]

    this._guildData[guild].permissions = {
      ...this._guildData[guild].permissions,
      [role]: parsedLevel
    }

    if (this._options.postEventFunctions.permission) this._options.postEventFunctions.permission(guild, role, level, oldLevel)

    return this._guildData[guild].permissions
  }
}

module.exports = Agent

/**
 * @callback                       Middleware
 * @param   {Eris.Message}         msg        The message
 * @param   {Eris.Member}          member     The subject member of the guild
 * @param   {Command|ReactCommand} command    The command
 */

/**
 * @typedef {Object}         GuildData
 * @prop    {Object}         guildID             The ID of the guild mapped to its data
 * @prop    {PermissionList} guildID.permissions The authority levels of roles in a guild
 * @prop    {String}         guildID.prefix      The custom server-side prefix for the guild
 */

/**
 * A list of permissions for each role of a guild
 * @typedef {Object} PermissionList
 * @prop    {Number} roleID         The ID of the role mapped with its authority level
 */

/**
 * The status for the bot. It's a callback function for each shard
 * @callback                         StatusMessageFunction
 * @param    {Eris.Shard.editStatus} editStatus            The setStatus function from the Eris client
 * @param    {Agent}                 agent                 The agent
 * @param    {Number}                shard                 The Eris shard the status is being applied to
 */

/**
 * A function that runs after every message whether it triggers a command or not
 * @callback                         PostMessageFunction
 * @param    {Eris.Message}          msg                 The message that triggered the command
 * @param    {CommandHandlerResults} results             The results of the command
 */

/**
 * A function that runs after every reaction whether it triggers a react command or not
 * @callback                          PostReactionFunction
 * @param    {Eris.Message}           msg                  The message reacted on
 * @param    {Object}                 emoji                The data of the emoji reacted with
 * @param    {Eris.User}              user                 The user who reacted
 * @param    {ReactionHandlerResults} results              The results of the react command
 */

/**
 * A function that runs after a permission is changed
 * @callback          PostPermissionFunction
 * @param    {String} guild                  The ID of the guild
 * @param    {String} role                   The ID of the role being altered
 * @param    {Number} level                  The new authority level of the role
 * @param    {Number} oldLevel               The old authority level of the role
 */

/**
 * A function that runs after a guild prefix is changed
 * @callback          PostPrefixFunction
 * @param    {String} guild              The ID of the guild
 * @param    {String} prefix             The new prefix
 * @param    {String} oldPrefix          The old prefix of the guild
 */

/**
 * An object returned by the agent's buildHelp method (Properties may vary based on what was supplied to the method)
 * @typedef {Object}                   BuildHelpReturnObject
 * @prop    {Object|undefined}         embed                 If embed data was supplied, the resulting help menu in a Discord embed format
 * @prop    {ReactInterface|undefined} reactInterface        If embed data was supplied and the help menu is more than one page, a react interface to scroll the help menu
 * @prop    {String[]}                 pages                 The pages of the help menu. Only one is displayed in the embed and it's chosen by the page parameter (It's standard practice to build a new help menu for every command initiation)
 */
