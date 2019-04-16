class PseudoDiscordClient {
  constructor () {
    this.user = {
      id: String(Date.now() - 20000)
    }
  }
  _buildMessage (content, authorId = String(Date.now() - 20000), channelId = String(Date.now() - 10000)) {
    return {
      content,
      id: String(Date.now()),
      author: {
        username: 'foo',
        id: authorId
      },
      channel: {
        id: channelId,
        createMessage: async () => null
      }
    }
  }
}

module.exports = PseudoDiscordClient
