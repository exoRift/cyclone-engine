import { Agent } from 'modules'
import { Base } from './base'
import { Origin } from 'structures/response'

/**
 * An operation to delete a message after some interval
 */
export class Expire extends Base<number> {
  readonly type = 'operation'

  async execute (target: Origin, agent: Agent): Promise<Origin | void> {
    if (target.type !== 'message') throw Error('Attempted to execute an expiration on a non-message')

    setTimeout(() => {
      target.value.delete()
        .catch((err) => agent.report('error', 'Failed to delete a message via the expire operation', err))
    }, this.data)

    return target
  }
}
