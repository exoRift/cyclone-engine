import Oceanic from 'oceanic.js'

import {
  Agent,
  EffectHandler
} from 'modules'

import { Effect } from 'structures/effect'

export interface RequestData<E extends keyof Oceanic.ClientEvents> {
  agent: Agent,
  handler: EffectHandler,
  client: Oceanic.Client
  effect: Effect.Base,
  raw: Oceanic.ClientEvents[E],
  channel: Oceanic.Channel,
  user: Oceanic.User,
  member?: Oceanic.Member,
  args?: 
}

export class RequestEntity<E extends keyof Oceanic.ClientEvents> implements RequestData<E> {
  constructor (data: RequestData) {
    
  }

  get guild ()
}
