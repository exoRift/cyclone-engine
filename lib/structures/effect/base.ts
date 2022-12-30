import * as Oceanic from 'oceanic.js'

import { RequestEntity } from 'structures/request'
import { ResponseEntity } from 'structures/response'

/** The base effect class */
export abstract class Base {
  /** The identifer of this effect */
  abstract _identifier: string
  /** The events that trigger this effect */
  abstract _triggerEvents: Array<keyof Oceanic.ClientEvents>

  /** The action to execute on trigger */
  abstract action: <E extends keyof Oceanic.ClientEvents>(req: RequestEntity<E>, res: ResponseEntity) => void | string | object
}
