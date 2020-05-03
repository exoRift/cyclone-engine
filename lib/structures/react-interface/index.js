const ReactCommand = require('../react-command/')

/**
 * An array of emoji button that attach to a message to do different actions.
 */
class ReactInterface {
  /**
   * Construct a react interface.
   * @class
   * @param {Object}                      data                                The react interface data.
   * @prop  {ReactCommand[]|ReactCommand} data.buttons                        The buttons of the interface.
   * @prop  {Object}                      [data.options={}]                   The options for the interface.
   * @prop  {Boolean}                     [data.options.restricted=false]     Whether all buttons of the interface are restricted to selected users or not.
   * @prop  {String[]|String}             [data.options.designatedUsers]      The IDs of the users who can use the react interface. By default, if restricted is true, it's the owner of the message reacted on.
   * @prop  {Boolean}                     [data.options.deleteAfterUse=false] Whether the interface is deleted after a use or not.
   * @prop  {Boolean}                     [data.options.removeReaction=false] Whether the triggering reaction is removed after executed or not.
   */
  constructor ({ buttons, options = {} }) {
    if (!Array.isArray(buttons)) buttons = [buttons]

    const {
      restricted,
      designatedUsers,
      deleteAfterUse,
      removeReaction
    } = options

    /**
     * The buttons of the interface.
     * @type {Map<String, ReactCommand>}
     */
    this.buttons = new Map()
    for (const button of buttons) {
      if (!(button instanceof ReactCommand)) throw TypeError('Supplied button not ReactCommand instance:\n' + button)

      if (restricted) button.restricted = true
      if (designatedUsers) button.designatedUsers = Array.isArray(designatedUsers) ? designatedUsers : [designatedUsers]
      if (removeReaction) button.removeReaction = true

      button.parentInterface = this

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
    if (designatedUsers) this.designatedUsers = Array.isArray(designatedUsers) ? designatedUsers : [designatedUsers]

    /**
     * Whether the interface is deleted after a use or not.
     * @type {Boolean}
     */
    this.deleteAfterUse = deleteAfterUse

    /**
     * Whether the triggering reaction is removed after executed or not.
     * @type {Boolean}
     */
    this.removeReaction = removeReaction
  }
}

module.exports = ReactInterface
