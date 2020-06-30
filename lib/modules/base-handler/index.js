const {
  inspect
} = require('util')

const {
  IgnoredError
} = require('../../errors/')

/**
 * A base handler containing handler utilities
 */
class BaseHandler {
  /**
   * Construct a Handler
   * @class
   * @param {Object}      data                The handler data
   * @prop  {Agent}       [data.agent]        The agent managing the bot
   * @prop  {Eris.Client} data.client         The Eris client
   * @prop  {Object}      [data.options={}]   Additional options for the command handler
   * @prop  {Object}      [data.options._app] The Discord bot app info (If not supplied, the app is gotten automatically)
   */
  constructor ({ agent, client, options = {} }) {
    const {
      _app
    } = options

    /**
     * The agent managing the bot
     * @private
     * @type    {Agent}
     */
    this._agent = agent

    /**
     * The Eris client
     * @private
     * @type    {Eris}
     */
    this._client = client

    /**
     * The Discord app of the bot
     * @private
     * @type    {Object}
     */
    this._app = _app

    if (!_app) this._getApp()
  }

  /**
   * Get the bot's app data and store it in `this.app`
   * @private
   * @returns {Promise<Object>} The app data
   */
  _getApp () {
    return this._client.getOAuthApplication().then((app) => {
      this._app = app

      return app
    })
  }

  /**
   * Send a response to Discord
   * @private
   * @async
   * @param   {Eris.TextChannel}      channel             The ID of the channel to send the response to
   * @param   {Object}                msgData             The data for the response message
   * @prop    {String}                [msgData.content]   The response content
   * @prop    {Object}                [msgData.embed]     The response embed
   * @prop    {Object}                [msgData.file]      The response file
   * @prop    {String}                [msgData.file.name] The name of the file
   * @prop    {Buffer}                [msgData.file.file] The file content
   * @returns {Promise<Eris.Message>}                     The resulting response or a returned error of minor reasons why the response failed
   */
  async _sendResponse (channel, { content, embed, file }) {
    if (!this.validateChannel(channel)) throw new IgnoredError('Invalid Channel', 'The provided channel was not valid to send a message to', 400)

    if (content || embed || file) {
      if (file && !(file.file instanceof Buffer)) throw TypeError('Supplied file is not a Buffer instance:\n' + (file.file || file))

      return channel.createMessage({ content, embed }, file)
        .catch((err) => {
          if (err.code === 50035 && (err.message.includes('length') || err.message.includes('size'))) {
            return channel.createMessage('Text was too long, sent as a file instead.', {
              name: 'Command Result.txt',
              file: Buffer.from(`${content || 'undefined'}\n\n${inspect(embed)}`)
            })
          }

          throw err
        })
    }
  }

  /**
   * Check that a channel is valid to send a message to (Minimizes bad requests and reduces ratelimiting)
   * @param   {Eris.Channel} channel The channel to verify
   * @returns {Boolean}              Whether a message can be sent to the channel or not
   */
  validateChannel (channel) {
    if (channel && this._client.channelGuildMap[channel.id] && [0, 1].includes(channel.type) && (!channel.type ? channel.permissionsOf(this._client.user.id).has('sendMessages') : true)) return true
    else return false
  }
}

module.exports = BaseHandler
