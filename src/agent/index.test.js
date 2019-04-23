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
  t.context.listeners = {
    log: sinon.spy(console, 'log'),
    error: sinon.spy(console, 'error')
  }
})

test.afterEach((t) => {
  for (const listener in t.context.listeners) t.context.listeners[listener].restore()
})

test.todo('No database')

test.todo('Database')

test.todo('Initial tables')

test.todo('Table cleanup')

test.todo('Connect retry limit')

test.todo('No DBL')

test.todo('DBL')

test.todo('Interval check')

test.todo('Message event')

test('lastMessage', (t) => {
  const agent = new Agent({
    Eris: PDiscord,
    chData,
    databaseOptions: {
      connectionURL: DATABASE_URL,
      client: 'pg'
    }
  })

  const guild = agent._client._createGuild('1', agent._client)
  const channel = agent._client._createChannel('1', guild)

  agent._client._sendMessage('hello', agent._client.user, channel)

  t.is(agent.lastMessage(channel).content, 'hello')
})

test.todo('Error recieved')

test.todo('Disconnection')
