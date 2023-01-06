import * as Oceanic from 'oceanic.js'

import { RequestEntity } from 'structures/request'

import { EffectEventGroup } from 'types'

import {
  Operation,
  MessageOperationData,
  Origins
} from 'structures/operation'

// todo: message (content, embed, file {channel, deleteAfter}), followup {expires after}, react, buttons

/**
 * A structured method to respond to effect calls
 * @template E The event group that will utilize this response entity
 */
export class ResponseEntity<E extends keyof EffectEventGroup = keyof EffectEventGroup> {
  /** The ID of the last channel this response was active in */
  private _lastChannel?: Oceanic.TextChannel
  /** The ID of the last message this response was active on */
  private _lastMessage?: Oceanic.Message
  private _operations: Operation.Base<object, keyof Origins>[] = []
  private _executionPromise?: Promise<this>

  /** The corresponding request entity to this response */
  request: RequestEntity<E>

  /**
   * Construct a response
   * @param request The corresponding request entity
   */
  constructor (request: RequestEntity<E>, originChannel?: Oceanic.TextChannel, originMessage?: Oceanic.Message) {
    this.request = request

    this._lastChannel = originChannel
    this._lastMessage = originMessage
  }

  message (data: string | MessageOperationData): this {
    delete this._executionPromise

    if (typeof data === 'string') data = { content: data }

    this._operations.push(new Operation.Message(data))

    return this
  }

  followup () {
    delete this._executionPromise
  }

  react () {
    delete this._executionPromise
  }

  interface () {
    delete this._executionPromise
  }

  execute (): Promise<this> {
    // NOTE: The errors thrown here are handled by the effect handler's callAction method
    this._executionPromise = this._operations
      .reduce((p, o) => {
        return p.then(() => {
          for (const requisite of o.requisites) {
            switch (requisite) {
              case 'channel':
                if (!this._lastChannel) throw Error('Could not find an origin channel to respond to!')

                break
              case 'message':
                if (!this._lastMessage) throw Error('Could not find an origin message to latch onto!')

                break
            }
          }

          return o.execute({
            channel: this._lastChannel!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
            message: this._lastMessage! // eslint-disable-line @typescript-eslint/no-non-null-assertion
          })
            .then((updates) => {
              if (updates.channel) this._lastChannel = updates.channel
              if (updates.message) this._lastMessage = updates.message
            })
        })
      }, Promise.resolve())
      .then(() => this)

    return this._executionPromise
  }

  get then () {
    return (this._executionPromise ?? this.execute()).then
  }

  get catch () {
    return (this._executionPromise ?? this.execute()).catch
  }

  get finally () {
    return (this._executionPromise ?? this.execute()).finally
  }
}
