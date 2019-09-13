const Agent = require('./agent/')

const {
  Command,
  Replacer,
  Await,
  ReactCommand,
  ReactInterface
} = require('./structures/')

const {
  CommandHandler,
  ReactionHandler,
  InputError
} = require('./modules/')

module.exports = {
  Agent,
  Command,
  Replacer,
  Await,
  ReactCommand,
  ReactInterface,
  CommandHandler,
  ReactionHandler,
  InputError
}

/**
 * Arguments that go into a command.
 * @typedef {Object}  Argument
 * @prop    {String}  Argument.name            The name of the argument.
 * @prop    {Boolean} [Argument.mand=false]    Whether the argument is mandatory for the command to work or not.
 * @prop    {String}  [Argument.delim=' ']     The delimiter (The character(s) that separate(s) it from the argument after it) for the argument.
 * @prop    {String}  [Argument.type='string'] The type of argument. ('string', 'number')
 */

/**
 * Object returned by a command action.
 * @typedef {Object}          CommandResults
 * @prop    {String}          [CommandResults.content]                The resulting message content sent by the bot.
 * @prop    {Eris.Embed}      [CommandResults.embed]                  The resulting embed sent by the bot.
 * @prop    {Buffer}          [CommandResults.file]                   The resulting file sent by the bot.
 * @prop    {Object}          [CommandResults.options={}]             Options for the response message.
 * @prop    {String[]|String} [CommandResults.channels]               The channel IDs to send the resulting messages. By default, it's the same channel the executing message was sent.
 * @prop    {Await}           [CommandResults.options.wait]           An action that is awaited after the results are processed.
 * @prop    {ReactInterface}  [CommandResults.options.reactInterface] A react interface that is bound to the resulting message.
 * @prop    {Number}          [CommandResults.options.deleteAfter]    The number of milliseconds to wait before deleting the response.
 */

/**
 * @typedef {String} MinorError
 * @example                     invalidChannel     - The target channel doesn't exist.
 * @example                     channelPermissions - The bot doesn't have permission to talk in the target channel.
 * @example                     channelType        - The target channel is not a text channel.
 */
