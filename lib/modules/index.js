module.exports = {
  Command: require('./command'),
  Await: require('./await'),
  Replacer: require('./replacer'),
  ReactCommand: require('./react-command'),
  ReactInterface: require('./react-interface'),
  _CommandHandler: require('./command-handler'),
  _ReactionHandler: require('./reaction-handler'),
  _InputError: require('./command-handler/input-error.js')
}

/**
 * Arguments that go into a command.
 * @typedef {Object}  Argument
 * @prop    {String}  Argument.name            The name of the argument.
 * @prop    {Boolean} [Argument.mand=false]    Whether the argument is mandatory for the command to work or not.
 * @prop    {String}  [Argument.delim=' ']     The delimiter (The character that separates it from the argument after it) for the argument.
 * @prop    {String}  [Argument.type='string'] The type of argument. ('string', 'number')
 */

/**
 * Object returned by a command action.
 * @typedef {Object}         CommandResults
 * @prop    {String}         [CommandResults.content]                The resulting message content sent by the bot.
 * @prop    {Eris.Embed}     [CommandResults.embed]                  The resulting embed sent by the bot.
 * @prop    {Buffer}         [CommandResults.file]                   The resulting file sent by the bot.
 * @prop    {Object}         [CommandResults.options={}]             Options for the response message.
 * @prop    {String}         [CommandResults.channel]                The channel ID to send the resulting message. By default, it's the same channel the executing message was sent.
 * @prop    {Await}          [CommandResults.options.wait]           An action that is awaited after the results are processed.
 * @prop    {ReactInterface} [CommandResults.options.reactInterface] A react interface that is bound to the resulting message.
 * @prop    {Number}         [CommandResults.options.deleteAfter]    The number of milliseconds to wait before deleting the response.
 */

/**
 * @typedef {String} MinorError
 * @example                     invalidChannel     - The target channel doesn't exist.
 * @example                     channelPermissions - The bot doesn't have permission to talk in the target channel.
 * @example                     channelType        - The target channel is not a text channel.
 */
