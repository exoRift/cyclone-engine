/**
 * A Command Arg.
 * @typedef  {Object}  Arg
 * @property {String}  name         The name of the arg.
 * @property {Boolean} [mand=false] Whether or not this arg is mandatory.
 * @property {String}  [delim=' ']  The delimiting character for this arg.
 */

/**
 * Class representing a command.
 */
class Command {
  /**
   * Create a command.
   * @param {Object}   data                            The command data.
   * @param {String}   data.name                       The command name.
   * @param {String}   data.desc                       The command description.
   * @param {Function} data.action                     The command action.
   * @param {Object}   [data.options={}]               The command options.
   * @param {Arg[]}    [data.options.args=[]]          List of arguments that the command takes.
   * @param {String}   [data.options.dbTable='']       Name of database table to fetch, data is passed through to action with the same name.
   * @param {Boolean}  [data.options.restricted=false] Whether or not this command is restricted to admin only.
   */
  constructor ({ name, desc, action, options = {} }) {
    const {
      args = [],
      dbTable = '',
      restricted = false
    } = options

    /**
     * The command name.
     * @type {String}
     * @private
     */
    this.name = name
    /**
     * The command description.
     * @type {String}
     */
    this.desc = desc
    /**
     * The command action.
     * @type {Function}
     */
    this.action = action
    /**
     * List of arguments that the command takes.
     * @type {Arg[]}
     */
    this.args = args
    /**
     * Name of database table to fetch, data is passed through to action with the same name.
     * @type {String}
     */
    this.dbTable = dbTable
    /**
     * Whether or not this command is restricted to admin only.
     * @type {Boolean}
     */
    this.restricted = restricted
  }

  /**
   * Get info of this command.
   * @returns {String} A string describing the command.
   */
  get info () {
    return `**${this.name}` + this.args.reduce((a, e, i) => {
      const content = a + (e.mand ? `<${e.name}>` : `(${e.name})`) + (e.delim || ' ')
      return (i === this.args.length - 1) ? content.slice(0, -1 * (e.delim ? e.delim.length : 1)) : content
    }, ' ') + `** - *${this.desc}*`
  }
}

module.exports = Command
