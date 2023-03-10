import { Base } from './base'
import { Origin } from 'structures/response'
import {
  RequestType,
  RequestEntity
} from 'structures/request'
import { EffectEventGroup } from 'types'

/**
 * An operation to delete a message after some interval
 */
export class Expire extends Base<number> {
  readonly type = 'operation'

  async execute<E extends keyof EffectEventGroup, T extends RequestType = RequestType.ACTION> (
    target: Origin,
    req: RequestEntity<E, T>
  ): Promise<Origin | void> {
    if (target.type !== 'message') throw Error('Attempted to execute an expiration on a non-message')

    setTimeout(() => {
      target.value.delete()
        .catch((err) => req.agent.report('error', 'Failed to delete a message via the expire operation', err))
    }, this.data)

    return target
  }
}
