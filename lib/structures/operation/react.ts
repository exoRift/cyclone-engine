import { Base } from './base'
import { Origin } from 'structures/response'

/**
 * An operation to send a message
 */
export class React extends Base<string> {
  readonly type = 'operation'

  async execute (target: Origin): Promise<Origin | void> {
    if (target.type !== 'message') throw Error('Attempted to add a reaction to a non-message')

    await target.value.createReaction(this.data)

    return target
  }
}
