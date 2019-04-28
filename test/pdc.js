const Collection = require('eris').Collection
const EventEmitter = require('events').EventEmitter

/**
 * A fake Eris client for testing.
 */
class PseudoDiscordClient extends EventEmitter {
  /**
   * Create a client.
   * @param {String} [token='123456'] The token for the bot.
   */
  constructor (token = '123456') {
    super()
    /**
     * The bot's token.
     * @type {String}
     */
    this.token = token
    /**
     * The user data for the bot.
     * @type {User}
     */
    this.user = new User('1')
    /**
     * The list of shards the bot is "running on".
     * @type {Collection}
     */
    this.shards = new Collection()
    /**
     * The list of guilds the bot is in.
     * @private
     * @type {Collection}
     */
    this._guilds = new Collection()

    this._createShard()
  }

  /**
   * Create a shard of the client.
   * @private
   * @param   {PDiscord} shardClient The client to shard.
   * @returns {Shard}                The created shard.
   */
  _createShard (shardClient = this) {
    const shard = new Shard(shardClient)
    this.shards.set(shard.id, shard)
    return shard
  }

  /**
   * Create a guild for the bot to join.
   * @private
   * @param   {String} id     The guild id.
   * @param   {Shard}  shard  The shard of the bot in the guild.
   * @param   {String} name   The name of the guild.
   * @returns {Guild}         The created guild.
   */
  _createGuild (id, shard = this.shards.get(0), name) {
    const guild = new Guild(id, shard, name)
    this._guilds.set(id, guild)
    return guild
  }

  /**
   * Create a channel of a guild.
   * @private
   * @param   {String}  id    The id of the channel.
   * @param   {Guild}   guild The guild the channel's in.
   * @param   {String}  name  The name of the guild.
   * @returns {Channel}       The created channel.
   */
  _createChannel (id, guild, name) {
    const channel = new Channel(id, guild, name)
    return channel
  }

  /**
   * Send a message in a channel.
   * @private
   * @param   {String}  content The content of the message.
   * @param   {User}    author  The author of the message.
   * @param   {Channel} channel The channel the message is sent in.
   * @returns {Message}         The created message.
   */
  _sendMessage (content, author, channel) {
    const message = new Message(content, author, channel)
    return message
  }

  /**
   * Set whether the connect method should succeed or fail.
   * @private
   * @param {Boolean} status The status of the connect method.
   */
  _setConnectStatus (status) {
    this._connectStatus = status
  }

  /**
   * Connect to "Discord"
   */
  async connect () {
    if (!this._connectStatus) throw Error()
    this.emit('ready')
    this.emit('shardReady', this.shards.get(0).id)
  }

  /**
   * Return fake OAuth application data.
   */
  async getOAuthApplication () {
    return {
      owner: {
        id: this.user.id
      }
    }
  }
}

/**
 * Create a Discord Message.
 */
class Message {
  /**
   * Create a Message.
   * @param {String}  content The content of the message.
   * @param {User}    author  The author of the message.
   * @param {Channel} channel The channel the message is being sent in.
   */
  constructor (content, author = new User(), channel = new Channel(undefined, new Guild())) {
    this.id = String(Date.now())
    this.content = content
    this.author = author
    this.channel = channel
    this.timestamp = this.id

    channel.messages.set(this.id, this)
  }
}
/**
 * Create a Discord User.
 */
class User {
  /**
   * Create a user.
   * @param {String} id       The id of the user.
   * @param {String} username The username of the user.
   */
  constructor (id = String(Date.now()), username = 'user') {
    this.id = id
    this.username = username
  }
}

/**
 * Create a Discord Channel.
 */
class Guild {
  /**
   * Create a guild.
   * @param {String} id    The id of the guild.
   * @param {Shard}  shard The shard that's on the guild.
   * @param {String} name  The name of the guild.
   */
  constructor (id = String(Date.now()), shard = new Shard(), name = 'guild') {
    this.id = id
    this.shard = shard
    this.channels = new Collection()
  }
}

/**
 * Create a Discord Channel.
 */
class Channel {
  /**
   * Create a channel.
   * @param {String} id    The id of the channel.
   * @param {Guild}  guild The guild the channel is in.
   * @param {String} name  The name of the channel.
   */
  constructor (id = String(Date.now()), guild = new Guild(), name = 'channel') {
    this.id = id
    this.guild = guild
    this.name = name
    this.messages = new Collection()

    guild.channels.set(id, this)
  }

  async createMessage (content) {
    if (this._createMessageThrow) throw Error('This is purposefully thrown')
    if (content && (typeof content === 'string' || typeof content.content)) {
      if ((content.content && content.content.length > 2000) || content.length > 2000) {
        const error = Error()
        error.code = 50035
        throw error
      }
    }
    return true
  }
}

/**
 * Create a Discord Shard.
 */
class Shard {
  /**
   * Create a shard.
   * @param {PseudoDiscordClient} client The client to shard.
   */
  constructor (client = new PseudoDiscordClient()) {
    this.id = client.shards.length || 0
    this.client = client
  }

  async editStatus () {

  }
}

PseudoDiscordClient.Message = Message
PseudoDiscordClient.User = User
PseudoDiscordClient.Channel = Channel
PseudoDiscordClient.Guild = Guild
PseudoDiscordClient.Shard = Shard

module.exports = PseudoDiscordClient
