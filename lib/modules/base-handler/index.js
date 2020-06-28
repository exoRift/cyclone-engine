const {
  inspect
} = require('util')

const {
  IgnoredError
} = require('../../errors/')

/**
 * A base handler containing handler utilities
 */
class Handler {
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
    if (this._agent && !this._agent.validateChannel(channel)) throw new IgnoredError('Invalid Channel', 'The provided channel was not valid to send a message to', 400)

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
}

module.exports = Handler
