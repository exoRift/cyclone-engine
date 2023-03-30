import { Base } from './base'
import { Origin } from 'structures/response'

/**
 * An operation to react to a message
 */
export class React extends Base<string> {
  readonly type = 'operation'

  async execute (targets: Array<Origin[keyof Origin]>): Promise<void> {
    const target = targets.findLast((t): t is Origin['Message'] => t.type === 'message')
    if (!target) throw Error('Attempted to add a reaction to a non-message')

    await target.value.createReaction(this.data)
  }
}
