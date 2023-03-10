import * as Oceanic from 'oceanic.js'

import { Base } from '../base'
import { Message } from '../message'
import {
  RequestType,
  RequestEntity
} from 'structures/request'
import {
  Action,
  DistributiveOmit,
  EffectEventGroup
} from 'types'

/** Input data for the message operator */
export type InterfaceComponent =
  Oceanic.URLButton
  | (
    DistributiveOmit<Exclude<Oceanic.MessageComponent, Oceanic.URLButton>, 'customID'>
    & (
      {
        id: string
      }
      | {
        action: Action<keyof EffectEventGroup, RequestType.SUBACTION>
      }
    )
  )

export class Interface extends Base<InterfaceComponent[][], 'modifier', typeof Message> {
  readonly type = 'modifier'

  /**
   * Compile a component object into the raw format for Oceanic
   * @template E         The event group of the relevant request
   * @template T         The type of the relevant request
   * @param    msg       The relevant message operation
   * @param    req       The request prompting this operation
   * @param    component The component to compile
   * @returns            The compiled component
   */
  static compileComponent<E extends keyof EffectEventGroup, T extends RequestType> (
    msg: Message,
    req: RequestEntity<E, T>,
    component: InterfaceComponent
  ): Oceanic.MessageComponent {
    // Link button
    if (component.type === Oceanic.ComponentTypes.BUTTON && component.style === Oceanic.ButtonStyles.LINK) return component

    // Static subaction
    if ('id' in component) {
      if (component.id in req.effect.subactions) {
        const transition = {
          ...component,
          customID: ['STATIC', req.effect._trigger.events[0], req.effect._identifier, component.id].join('.'), // Use first available event index to find the effect
          id: undefined
        }

        return transition
      } else throw Error('Attempted to reference a non-existent subaction')
    }

    // Temporary subaction
    if (!msg.data.flags || !(msg.data.flags & (1 << 6))) throw Error('Attempted to attach a temporary subaction to a non-ephemeral message')

    const id = String(Date.now())

    req.agent.handler.registerTemporarySubaction(id, component.action)

    const transition = {
      ...component,
      customID: ['TEMP', req.effect._trigger.events[0], req.effect._identifier, id].join('.'), // Use first available event index to find the effect,
      id: undefined
    }

    return transition
  }

  execute<E extends keyof EffectEventGroup, T extends RequestType> (target: Message, req: RequestEntity<E, T>): void {
    target.data.components ||= []

    for (const row of this.data) {
      target.data.components.push({
        components: row.map((c) => Interface.compileComponent(target, req, c)),
        type: Oceanic.ComponentTypes.ACTION_ROW
      })
    }
  }
}
