import protoTest, { TestFn } from 'ava'
import sinon from 'sinon'
import Oceanic from 'oceanic.js'

import { Agent } from '.'
import { Effect } from 'structures'

declare interface Context {
  agent: Agent
  effects: {
    command: Effect.Command<Oceanic.ApplicationCommandTypes.CHAT_INPUT>
  }
}

const test = protoTest as TestFn<Context>

test.before((t) => {
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
})

test('effect registration', (t) => {
  t.context.agent.registerEffect(t.context.effects.command)
    .then(() => t.pass())
    .catch((e) => t.fail(e))
})
