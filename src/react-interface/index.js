const ReactCommand = require('../react-command')

/**
 * Class that represents a react interface.
 */
class ReactInterface {
  /**
   * Construct a react interface.
   * @class
   * @param {Object}          data                    The react interface data.
   * @prop  {ReactCommand[]}  data.buttons            The buttons of the interface.
   * @prop  {Object}          [data.options={}]       The options for the interface.
   * @prop  {Boolean}         [data.restricted=false] Whether the interface is restricted to selected users or not.
   * @prop  {String[]|String} [data.designatedUsers]  The IDs of the users who can use the interface. By default, if restricted is true, it's the owner of the message reacted on.
   */
  constructor ({ buttons, options = {} }) {
    const {
      restricted,
      designatedUsers
    } = options

    /**
     * Whether the interface is restricted to selected users or not.
     * @type {Boolean}
     */
    this._restricted = restricted

    /**
     * The IDs of the users who can use the interface.
     * @type {String[]|String}
     */
    this._designatedUsers = designatedUsers

    /**
     * The buttons of the interface.
     * @type {Map<String, ReactCommand>}
     */
    this._buttons = new Map()
    for (const button of buttons) {
      if (!(button instanceof ReactCommand)) throw TypeError('Supplied button not ReactCommand instance:\n' + button.emoji)
      this._buttons.set(button.emoji, button)
    }
  }
}

module.exports = ReactInterface
