import * as Oceanic from 'oceanic.js'

import { Base } from './base'
import { Origin } from '../../structures/response'

/** Input data for the message operation */
export type MessageOperationData = Oceanic.CreateMessageOptions

/**
 * An operation to send a message
 */
export class Defer extends Base<undefined> {
  readonly type = 'operation'

  constructor () {
    super(undefined)
  }

  async execute (targets: Array<Origin[keyof Origin]>): Promise<Origin[keyof Origin] | void> {
    const target = targets.findLast((t): t is Origin['Interaction'] => t.type === 'interaction')

    if (!target) throw Error('Attempted to defer a non-interaction')

    const interaction = target.value as Oceanic.CommandInteraction
    await interaction.defer()
  }
}
