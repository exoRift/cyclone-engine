import {
  ReactCommand
} from 'reactcommand/'

/** The type of interface and how it appears on a message */
enum InterfaceType {
  COMPONENT, /** New Discord component API */
  REACTION /** Reaction-based */
}

interface InterfaceComponent { // todo

}

/** Interface Options */
interface InterfaceOptions<T extends InterfaceType> {
  once?: boolean, /** Whether the interface is deleted after it's used */
  removeReactions?: T extends InterfaceType.REACTION ? boolean : never /** Whether to remove reactions from an interface after they're just added */
}

/** Input data for an interface */
interface InterfaceData {
  type: InterfaceType, /** The type of interface */
  components: Array<InterfaceData['type'] extends InterfaceType.REACTION ? ReactCommand : InterfaceComponent>, /** The components that make up the interface */
  options?: InterfaceOptions<InterfaceData['type']> /** Miscellaneous options for the interface */
}

/** An interactable interface that gets attached to existing messages */
class Interface implements InterfaceData {
  type: InterfaceType /** The type of interface */
  components: Array<ReactCommand | InterfaceComponent> /** The components that make up the interface */
  options: Required<InterfaceOptions<InterfaceType>> /** Miscellaneous options for the interface */
  designatedUsers: string[] = [] /** The designated users who can interact with this interface */

  /**
   * Construct an interface
   * @param {InterfaceData} data
   */
  constructor (data: InterfaceData) {
    const {
      type = InterfaceType.COMPONENT,
      components,
      options = {}
    }: InterfaceData = data

    const {
      once = false,
      removeReactions = false
    }: Omit<InterfaceOptions<typeof type>, 'removeReactions'> & { removeReactions?: boolean } = options

    this.type = type

    this.components = components

    this.options = {
      once,
      removeReactions
    }
  }

  /**
   * Designate this interface to be used by specific users
   * @param   {String[]}  users An array containing the user IDs
   * @returns {Interface}       The interface
   */
  designateFor (users: string[]): Interface {
    this.designatedUsers = users

    return this
  }
}

export default Interface

export {
  Interface,
  InterfaceData,
  InterfaceType
}
