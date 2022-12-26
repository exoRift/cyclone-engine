import {
  ClientEvents
} from 'oceanic.js'

/** The base effect class */
abstract class Base {
  /** The identifer of this effect */
  abstract _identifier: string
  /** The events that trigger this effect */
  abstract _triggerEvents: Array<keyof ClientEvents>

  /** The action to execute on trigger */
  abstract action: (data: object) => void|string|object
}

export default Base

export {
  Base
}
