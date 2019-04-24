import test from 'ava'
import sinon from 'sinon'
import Agent from '.'
import Command from '../modules/command'
import Await from '../modules/await'
import Replacer from '../modules/replacer'
import PDiscord from '../modules/pdc.js'
import QueryBuilder from 'simple-knex'

require('dotenv').config()

const {
  DATABASE_URL
} = process.env

const chData = {
  commands: [
    new Command({
      name: 'command1',
      desc: 'A test command',
      action: () => '1'
    })
  ],
  replacers: [
    new Replacer({
      name: 'replacer1',
      desc: 'A test replacer',
      action: () => 'r1'
    })
  ]
}

function delay (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

test.beforeEach((t) => {
  t.context.spies = {
    log: sinon.spy(console, 'log'),
    error: sinon.spy(console, 'error')
  }
})

test.afterEach((t) => {
  for (const spy in t.context.spies) t.context.spies[spy].restore()
})

test.todo('noDatabase')

test.todo('database')

test.todo('initialTables')

test.todo('tableCleanup')

test.serial('connectRetryLimit', async (t) => {
  const agent = new Agent({
    Eris: PDiscord
  })

  const spy = sinon.spy(agent._client, 'connect')

  return agent.connect().then(() => {
    t.true(t.context.spies.error.calledWith('RECONNECTION LIMIT REACHED; RECONNECTION CANCELED'), 'Connection failure pt. 1')
    return t.is(spy.callCount, 10, 'Connection failure pt. 2')
  })
})

test.skip('DBL', (t) => {
  const agent = new Agent({
    Eris: PDiscord,
    agentOptions: {
      dblToken: '123'
    }
  })
  return agent
})

test.serial('loopFunction', async (t) => {
  const spy = sinon.spy()

  const agent = new Agent({
    Eris: PDiscord,
    agentOptions: {
      loopFunction: spy,
      loopInterval: 200
    }
  })

  await delay(500)

  t.true(spy.calledTwice)

  return agent
})

test.todo('messageEvent')

test.serial('lastMessage', (t) => {
  const agent = new Agent({
    Eris: PDiscord
  })

  const guild = agent._client._createGuild('1', agent._client)
  const channel = agent._client._createChannel('1', guild)

  agent._client._sendMessage('hello', agent._client.user, channel)

  t.is(agent.lastMessage(channel).content, 'hello')
})

test.todo('errorRecieved')

test.todo('disconnection')
