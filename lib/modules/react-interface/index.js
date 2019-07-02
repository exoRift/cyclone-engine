const ReactCommand = require('../react-command')

/**
 * Class that represents a react interface.
 */
class ReactInterface {
  /**
   * Construct a react interface.
   * @class
   * @param {Object}          data                                The react interface data.
   * @prop  {ReactCommand[]}  data.buttons                        The buttons of the interface.
   * @prop  {Object}          [data.options={}]                   The options for the interface.
   * @prop  {Boolean}         [data.options.restricted=false]     Whether all buttons of the interface are restricted to selected users or not.
   * @prop  {String[]|String} [data.options.designatedUsers]      The IDs of the users who can use the react interface. By default, if restricted is true, it's the owner of the message reacted on.
   * @prop  {String}          [data.options.dbTable]              Name of database table to fetch user data from (primary key must be named `id`).
   * @prop  {Boolean}         [data.options.deleteAfterUse=false] Whether the interface is deleted after a use or not.
   * @prop  {Boolean}         [data.options.removeReaction=false] Whether the triggering reaction is removed after executed or not.
   */
  constructor ({ buttons, options = {} }) {
    const {
      restricted,
      designatedUsers,
      dbTable,
      deleteAfterUse,
      removeReaction
    } = options

    /**
     * The buttons of the interface.
     * @type {Map<String, ReactCommand>}
     */
    this.buttons = new Map()
    for (const button of buttons) {
      if (!(button instanceof ReactCommand)) throw TypeError('Supplied button not ReactCommand instance:\n' + button.emoji)
      if (restricted) button.restricted = true
      if (designatedUsers) button.designatedUsers = designatedUsers instanceof Array ? designatedUsers : [designatedUsers]
      if (dbTable) button.dbTable = dbTable
      if (removeReaction) button._removeReaction = removeReaction

      this.buttons.set(button.emoji, button)
    }

    /**
     * Whether all buttons of the interface are restricted to selected users or not.
     * @type {Boolean}
     */
    this.restricted = restricted

    /**
     * The IDs of the users who can use the react interface. By default, if restricted is true, it's the owner of the message reacted on.
     * @type {String[]}
     */
    if (designatedUsers) this.designatedUsers = designatedUsers instanceof Array ? designatedUsers : [designatedUsers]

    /**
     * Name of database table to fetch user data from (primary key must be named `id`).
     * @private
     * @type {String}
     */
    this._dbTable = dbTable

    /**
     * Whether the interface is deleted after a use or not.
     * @private
     * @type    {Boolean}
     */
    this._deleteAfterUse = deleteAfterUse

    /**
     * Whether the triggering reaction is removed after executed or not.
     * @private
     * @type    {Boolean}
     */
    this._removeReaction = removeReaction
  }
}

module.exports = ReactInterface
