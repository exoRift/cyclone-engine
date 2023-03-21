import * as Oceanic from 'oceanic.js'

import { Base } from './base'
import { Origin } from 'structures/response'

/** Input data for the message operator */
export type MessageOperationData = Oceanic.CreateMessageOptions

/**
 * An operation to send a message
 */
export class Message extends Base<MessageOperationData> {
  readonly type = 'operation'

  private _getDestination (origin: Origin): Oceanic.AnyTextChannelWithoutGroup | Oceanic.AnyInteractionGateway | undefined {
    switch (origin.type) {
      case 'channel': return origin.value
      case 'interaction': return origin.value
      case 'message': return origin.value.channel
    }
  }

  async execute (target: Origin): Promise<Origin | void> {
    const destination = this._getDestination(target)

    // TODO: Make sure this never happens
    if (destination?.type === Oceanic.InteractionTypes.APPLICATION_COMMAND_AUTOCOMPLETE) throw Error('This interaction is unrespondable')

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
