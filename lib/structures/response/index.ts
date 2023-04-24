import * as Oceanic from 'oceanic.js'

import {
  RequestType,
  RequestEntity
} from '../../structures/request'

import {
  InterfaceComponent,
  Operation,
  MessageOperationData,
  ModalOperationData
} from '../../structures/operation'

import { EffectEventGroup } from '../../types'

/** The origins of an event utilized for response chaining */
export declare interface Origin {
  Interaction: {
    type: 'interaction'
    value: Oceanic.AnyInteractionGateway
  }
  Channel: {
    type: 'channel'
    value: Oceanic.AnyTextChannelWithoutGroup
  }
  Message: {
    type: 'message'
    value: Oceanic.Message
  }
}
// todo: message (content, embed, file {channel, deleteAfter}), followup {expires after}, react, buttons

/**
 * A structured method to respond to effect calls
 * @template E The event group that will utilize this response entity
 * @template T The type of the request pertaining to this reponse
 */
export class ResponseEntity<E extends keyof EffectEventGroup = keyof EffectEventGroup, T extends RequestType = RequestType.ACTION>
implements PromiseLike<ResponseEntity<E, T>> {
  /** A list of operations to be called on execution */
  private readonly _operations: Array<Operation.Base<unknown>> = []

  /** The origins of the response for chaining */
  private readonly _origins: Array<Origin[keyof Origin]>
  /** If this response is mid-execution, the execution promise */
  private _executionPromise?: Promise<this>

  /** Was a message sent yet? */
  private _messaged = false

  /** The corresponding request entity to this response */
  request: RequestEntity<E, T>

  /**
   * Construct a response
   * @param request The corresponding request entity
   */
  constructor (request: RequestEntity<E, T>, origin: Origin[keyof Origin]) {
    this.request = request

    this._origins = [origin]
  }

  /**
   * Send a response message in the last relevant channel
   * @param   data The message data
   * @returns      The response entity for chaining
   */
  message (data: string | MessageOperationData): this {
    delete this._executionPromise

    if (typeof data === 'string') data = { content: data }

    this._operations.push(new Operation.Message(data, this._messaged))

    this._messaged = true

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

  requestFollowup () { // TODO: requires message effect
    delete this._executionPromise
  }

  react (emoji: string): this {
    delete this._executionPromise

    this._operations.push(new Operation.React(emoji))

    return this
  }

  addInterface (components: InterfaceComponent[][]): this {
    delete this._executionPromise

    const msg = this._operations.findLast((o): o is Operation.Message => o instanceof Operation.Message)

    if (msg) new Operation.Interface(components).execute(msg, this.request)
    else throw Error('Could not find a message to add an interface to')

    return this
  }

  showModal (modal: ModalOperationData): this {
    delete this._executionPromise

    this._operations.push(new Operation.Modal(modal))

    return this
  }

  /**
   * Execute all queued operations
   * @example Use the promise-like events over this one
   */
  execute (): Promise<this> {
    // NOTE: The errors thrown here are handled by the effect handler's callAction method
    this._executionPromise = this._operations
      .reduce((p, o) => { // This reduction collapses the queued operations into a sequential linear promise
        return p.then(() => {
          return o.execute(this._origins, this.request)
            .then((update) => {
              if (update) this._origins.push(update)
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
