/**
 * Class representing a command.
 */
class Command {
  /**
   * Create a command.
   * @param    {Object}   data                            The command data.
   * @property {String}   data.name                       The command name.
   * @property {String}   data.desc                       The command description.
   * @property {Object}   [data.options={}]               The command options.
   * @property {Object[]} [data.options.args=[]]          List of arguments that the command takes.
   * @property {String}   [data.options.dbTable='']       Name of database table to fetch, data is passed through to action with the same name.
   * @property {Boolean}  [data.options.restricted=false] Whether or not this command is restricted to admin only.
   * @property {Function} data.action                     The command action. (Check docs for params)
   */
  constructor ({ name, desc, options = {}, action }) {
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
    /**
     * The command action.
     * @type {Function}
     */
    this.action = action
  }

  /**
   * Get info of this command.
   * @returns {String} A string describing the command. (**name <mand arg> (optional arg)** - *description*)
   */
  get info () {
    return `**${this.name}` + this.args.reduce((a, e, i) => {
      const content = a + (e.mand ? `<${e.name}>` : `(${e.name})`) + (e.delim || ' ')
      return (i === this.args.length - 1) ? content.slice(0, -1 * (e.delim ? e.delim.length : 1)) : content
    }, ' ') + `** - *${this.desc}*`
  }
}

module.exports = Command
