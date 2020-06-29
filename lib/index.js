const Agent = require('./agent/')

const {
  InputError,
  IgnoredError
} = require('./errors/')

const {
  BaseHandler,
  CommandHandler,
  ReactionHandler
} = require('./modules/')

const {
  Command,
  Replacer,
  Await,
  ReactCommand,
  ReactInterface
} = require('./structures/')

module.exports = {
  Agent,
  BaseHandler,
  CommandHandler,
  ReactionHandler,
  Command,
  Replacer,
  Await,
  ReactCommand,
  ReactInterface,
  InputError,
  IgnoredError
}

/**
 * @typedef {String} Prefix
 */

/**
 * A list of prefixes for each guild supplied to the Agent. It is mapped with a guild's ID equalling its prefix
 * @typedef {Object} PrefixList
 * @prop    {Prefix} guildID
 * @example                     { '463886367496339458': ';' }
 */

/**
 * Arguments that go into a command
 * @typedef {Object}  Argument
 * @prop    {String}  Argument.name            The name of the argument
 * @prop    {Boolean} [Argument.mand=false]    Whether the argument is mandatory for the command to work or not
 * @prop    {String}  [Argument.delim=' ']     The delimiter (The character(s) that separate(s) it from the argument after it) for the argument
 * @prop    {String}  [Argument.type='string'] The type of argument ('string', 'number')
 */

/**
 * Object returned by a command action
 * @typedef {Object}          CommandResults
 * @prop    {String}          [CommandResults.content]                The resulting message content sent by the bot
 * @prop    {Eris.Embed}      [CommandResults.embed]                  The resulting embed sent by the bot
 * @prop    {Buffer}          [CommandResults.file]                   The resulting file sent by the bot
 * @prop    {Object}          [CommandResults.options={}]             Options for the response message
 * @prop    {String[]|String} [CommandResults.options.channels]       The channel IDs to send the resulting messages. By default, it's the same channel the executing message was sent
 * @prop    {Await[]|Await}   [CommandResults.options.awaits]         An action or list of actions that are awaited after the results are processed
 * @prop    {ReactInterface}  [CommandResults.options.reactInterface] A react interface that is bound to the resulting message
 * @prop    {Number}          [CommandResults.options.deleteAfter]    The number of milliseconds to wait before deleting the response
 */
