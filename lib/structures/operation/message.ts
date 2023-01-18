import * as Oceanic from 'oceanic.js'

import {
  Base
} from './base'
import { Origin } from 'structures/response'

/** Input data for the message operator */
export type MessageOperationData = Oceanic.CreateMessageOptions

/**
 * An operation to send a message
 */
export class Message extends Base<MessageOperationData> {
  private _getDestination (origin: Origin): Oceanic.AnyTextChannelWithoutGroup | Oceanic.CommandInteraction | undefined {
    switch (origin.type) {
      case 'channel': return origin.value
      case 'interaction': return origin.value
      case 'message': return origin.value.channel
    }
  }

  async execute (origin: Origin): Promise<Origin | void> {
    const destination = this._getDestination(origin)

    return await destination?.createMessage(this.data) // todo: permission checking and catch
      .then((msg) => {
        if (!msg) return

        return {
          type: 'message',
          value: msg
        }
      })
  }
}
