const EventEmitter = require('events').EventEmitter

class PseudoDiscordClient extends EventEmitter {
  constructor (token, user) {
    super()
    this.token = token
    this.user = user
  }

  sendMessage () {

  }
}

class Message {
  constructor (content, author = new User(), channel = new Channel()) {
    this.id = String(Date.now())
    this.content = content
    this.author = author
    this.channel = channel
  }
}

class User {
  constructor (id = String(Date.now()), username = 'user') {
    this.id = id
    this.username = username
  }
}

class Channel {
  constructor (id = String(Date.now()), name = 'channel') {
    this.id = id
    this.name = name
    this.messages = new Map()
  }

  async createMessage () {
    return true
  }
}

PseudoDiscordClient.Message = Message
PseudoDiscordClient.User = User
PseudoDiscordClient.Channel = Channel

module.exports = PseudoDiscordClient
