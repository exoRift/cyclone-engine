import * as Oceanic from 'oceanic.js'

import { Base } from './base'
import { Origin } from '../../structures/response'
import { EffectEventGroup } from '../../types'
import { RequestEntity, RequestType } from '../../structures/request'

/** Input data for the modal operation */
export type ModalOperationData = Oceanic.ModalData

/**
 * An operation to send a modal
 */
export class Modal extends Base<ModalOperationData> {
  readonly type = 'operation'

  async execute<E extends keyof EffectEventGroup, T extends RequestType> (targets: Array<Origin[keyof Origin]>, req: RequestEntity<E, T>): Promise<void> {
    const target = targets.findLast((t): t is Origin['Interaction'] => t.type === 'interaction')
    if (!target) throw Error('Attempted to show a modal when not in an interaction context')

    await (target.value as Oceanic.CommandInteraction).createModal(this.data)
  }
}
