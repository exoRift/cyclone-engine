import * as Oceanic from 'oceanic.js'

import { RequestEntity } from 'structures/request'

import { EffectEventGroup } from 'types'

import {
  Operation,
  MessageOperationData
} from 'structures/operation'

/** The origins of an event utilized for response chaining */
export type Origin =
  | {
    type: 'interaction'
    value: Oceanic.CommandInteraction
  }
  | {
    type: 'channel'
    value: Oceanic.AnyTextChannelWithoutGroup
  }
  | {
    type: 'message'
    value: Oceanic.Message
  }

// todo: message (content, embed, file {channel, deleteAfter}), followup {expires after}, react, buttons

/**
 * A structured method to respond to effect calls
 * @template E The event group that will utilize this response entity
 */
export class ResponseEntity<E extends keyof EffectEventGroup = keyof EffectEventGroup> implements PromiseLike<ResponseEntity<E>> {
  /** A list of operations to be called on execution */
  private readonly _operations: Array<Operation.Base<unknown>> = []

  /** The origin of the response for chaining */
  private _origin: Origin
  /** If this response is mid-execution, the execution promise */
  private _executionPromise?: Promise<this>

  /** The corresponding request entity to this response */
  request: RequestEntity<E>

  /**
   * Construct a response
   * @param request The corresponding request entity
   */
  constructor (request: RequestEntity<E>, origin: Origin) {
    this.request = request

    this._origin = origin
  }

  /**
   * Send a response message in the last relevant channel
   * @param   data The message data
   * @returns      The response entity for chaining
   */
  message (data: string | MessageOperationData): this {
    delete this._executionPromise

    if (typeof data === 'string') data = { content: data }

    this._operations.push(new Operation.Message(data))

    return this
  }

  /**
   * Delete a message after a set interval
   * @param   interval The amount of time in milliseconds to wait
   * @returns          The response entity for chaining
   */
  deleteAfter (interval: number): this {
    delete this._executionPromise

    this._operations.push(new Operation.Expire(interval))

    return this
  }

  followup () { // todo
    delete this._executionPromise
  }

  react () { // todo
    delete this._executionPromise
  }

  interface () { // todo
    delete this._executionPromise
  }

  /**
   * Execute all queued operations
   * @example Use the promise-like events over this one
   */
  execute (): Promise<this> {
    // NOTE: The errors thrown here are handled by the effect handler's callAction method
    this._executionPromise = this._operations
      .reduce((p, o) => {
        return p.then(() => {
          return o.execute(this._origin, this.request.agent)
            .then((update) => {
              if (update) this._origin = update
            })
        })
      }, Promise.resolve())
      .then(() => this)

    return this._executionPromise
  }

  /** Execute operations and await successful outcome */
  get then () { // eslint-disable-line @typescript-eslint/explicit-function-return-type
    return (this._executionPromise ?? this.execute()).then
  }

  /** Execute operations and catch errors */
  get catch () { // eslint-disable-line @typescript-eslint/explicit-function-return-type
    return (this._executionPromise ?? this.execute()).catch
  }

  /** Execute operations and await all outcomes */
  get finally () { // eslint-disable-line @typescript-eslint/explicit-function-return-type
    return (this._executionPromise ?? this.execute()).finally
  }
}
