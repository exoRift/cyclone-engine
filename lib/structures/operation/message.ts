import * as Oceanic from 'oceanic.js'

import { Base } from './base'
import { Origin } from '../../structures/response'

/** Input data for the message operation */
export type MessageOperationData = Oceanic.CreateMessageOptions

/**
 * An operation to send a message
 */
export class Message extends Base<MessageOperationData> {
  readonly type = 'operation'
  readonly followup: boolean

  constructor (data: MessageOperationData, followup = false) {
    super(data)

    this.followup = followup
  }

  async execute (targets: Array<Origin[keyof Origin]>): Promise<Origin[keyof Origin] | void> {
    const target = targets[0]

    let method

    switch (target.type) {
      case 'interaction':
        method = (target.value as Oceanic.CommandInteraction)[this.followup ? 'createFollowup' : 'createMessage']

        break
      case 'message':
        method = target.value.channel?.createMessage

        break
      case 'channel':
        method = target.value.createMessage

        break
    }

    return await method?.(this.data)
      .then((msg) => {
        if (!msg) return

        return {
          type: 'message',
          value: msg
        }
      })
  }
}
