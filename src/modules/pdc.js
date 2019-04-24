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
     * The list of shard the bot is "running on".
     * @type {Collection}
     */
    this.shards = new Collection()
    /**
     * The list of guilds the bot is in.
     * @private
     * @type {Collection}
     */
    this._guilds = new Collection()
  }

  _createGuild (id, shardClient, name) {
    const guild = new Guild(id, shardClient, name)
    this._guilds.set(id, guild)
    return guild
  }

  _createChannel (id, guild, name) {
    const channel = new Channel(id, guild, name)
    return channel
  }

  _sendMessage (content, author, channel) {
    const message = new Message(content, author, channel)
    return message
  }

  setConnectStatus (status) {
    this._connectStatus = status
  }

  async connect () {
    if (!this._connectStatus) throw Error()
  }
}

class Message {
  constructor (content, author = new User(), channel = new Channel(undefined, new Guild())) {
    this.id = String(Date.now())
    this.content = content
    this.author = author
    this.channel = channel

    channel.messages.set(this.id, this)
  }
}

class User {
  constructor (id = String(Date.now()), username = 'user') {
    this.id = id
    this.username = username
  }
}

class Channel {
  constructor (id = String(Date.now()), guild = new Guild(), name = 'channel') {
    this.id = id
    this.guild = guild
    this.name = name
    this.messages = new Collection()

    guild.channels.set(id, this)
  }

  async createMessage () {
    return true
  }
}

class Guild {
  constructor (id = String(Date.now()), shardClient = new PseudoDiscordClient(), name = 'guild') {
    this.id = id
    if (shardClient) this.shard = new Shard(shardClient)
    this.channels = new Collection()
  }
}

class Shard {
  constructor (client) {
    this.id = client.shards.length
    this.client = client
  }
}

PseudoDiscordClient.Message = Message
PseudoDiscordClient.User = User
PseudoDiscordClient.Channel = Channel
PseudoDiscordClient.Guild = Guild
PseudoDiscordClient.Shard = Shard

module.exports = PseudoDiscordClient
