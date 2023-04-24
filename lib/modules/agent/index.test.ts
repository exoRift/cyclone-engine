import protoTest, { TestFn } from 'ava'
import sinon from 'sinon'
import * as Oceanic from 'oceanic.js'

import { Agent } from '.'
import { Effect } from '../../structures'

declare interface Context {
  agent: Agent
  effects: {
    command: Effect.Command<Oceanic.ApplicationCommandTypes.CHAT_INPUT>
  }
}

const test = protoTest as TestFn<Context>

test.before(async (t) => {
  t.context = {
    agent: new Agent('Bot 1234'),
    effects: {
      command: new Effect.Command({
        name: 'commandeffect',
        type: Oceanic.ApplicationCommandTypes.CHAT_INPUT,
        description: 'This is the command description'
      })
    }
  }

  await t.context.agent.connect()
})

test('effect registration', (t) => {
  return t.context.agent.registerEffect(t.context.effects.command)
    .then(() => t.pass())
    .catch((e: Error) => t.fail(e.message))
})
