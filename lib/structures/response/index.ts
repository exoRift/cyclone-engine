import * as Oceanic from 'oceanic.js'

import { RequestEntity } from 'structures/request'

import { EffectEventGroup } from 'types'

// todo: message (content, embed, file {channel, deleteAfter}), followup {expires after}, react, buttons

/** A structured method to respond to effect calls */
export class ResponseEntity<E extends keyof EffectEventGroup = keyof EffectEventGroup> {
  /** The corresponding request entity to this response */
  request: RequestEntity<E>

  /**
   * Construct a response
   * @param request The corresponding request entity
   */
  constructor (request: RequestEntity<E>) {
    this.request = request
  }

  message () {

  }

  followup () {

  }

  react () {

  }

  interface () {

  }
}
