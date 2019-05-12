import test from 'ava'
import sinon from 'sinon'
import Agent from '.'
import Command from '../modules/command'
import Replacer from '../modules/replacer'
import PDiscord from '../../test/pdc.js'
import QueryBuilder from 'simple-knex'

require('dotenv').config()

const {
  DATABASE_URL
} = process.env

const errorTest = Error('This is a fake command error')

const chData = {
  commands: [
    new Command({
      name: 'command1',
      desc: 'A test command',
      action: () => '1'
    }),
    new Command({
      name: 'commanderrortest',
      desc: 'Testing when a command throws an error',
      action: async () => {
        throw errorTest
      }
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

test.afterEach.always((t) => {
  for (const spy in t.context.spies) t.context.spies[spy].restore()
})

test.serial('databaseRecognized', (t) => {
  const oldFunc = Agent.prototype._prepareDB
  Agent.prototype._prepareDB = sinon.spy()

  const agent = new Agent({
    Eris: PDiscord,
    chData,
    databaseOptions: {
      connectionURL: DATABASE_URL,
      client: 'pg',
      tables: []
    }
  })

  t.truthy(agent._knex, 'Knex defined')
  t.true(agent._prepareDB.calledWith([]), 'prepareDatabases called')

  Agent.prototype._prepareDB = oldFunc
})

test.serial('tableCleanup', (t) => {
  const tables = [
    {
      name: 'cycloneagenttesting',
      columns: [
        {
          name: 'test',
          type: 'integer',
          default: 1
        },
        {
          name: 'nodefault',
          type: 'integer'
        }
      ]
    }
  ]

  const agent = new Agent({
    Eris: PDiscord
  })
  agent._knex = new QueryBuilder({
    connection: DATABASE_URL,
    client: 'pg',
    pool: {
      min: 1,
      max: 1
    }
  })

  return agent._knex.createTable(tables[0]).then(({ name }) => {
    return agent._knex.insert({
      table: name,
      data: {
        nodefault: 2
      }
    }).then(() => {
      agent._prepareDB(tables, [tables[0].name]).then(() => {
        return agent._knex.select(tables[0].name).then((res) => t.is(res.length, 0, 'Proper clean'))
      })
      return t.throwsAsync(agent._prepareDB(tables, ['nonexistent']), {
        instanceOf: Error,
        message: 'Provided a non-existent table'
      }, 'Non-existent table passed')
    })
  })
})

test.serial('connectRetryLimit', async (t) => {
  const agent = new Agent({
    Eris: PDiscord
  })

  const spy = sinon.spy(agent._client, 'connect')

  return agent.connect().then(() => {
    t.true(t.context.spies.error.calledWith('RECONNECTION LIMIT REACHED; RECONNECTION CANCELED'), 'Connection failure pt. 1')
    t.is(spy.callCount, 10, 'Connection failure pt. 2')
    return spy.restore()
  })
})

test.serial('DBL', async (t) => {
  const agent = new Agent({
    Eris: PDiscord,
    agentOptions: {
      dblToken: '123'
    }
  })
  const spy = sinon.spy(agent._dblAPI, 'postStats')

  agent._client._createGuild()

  agent._client._setConnectStatus(true)
  await agent.connect()

  t.true(spy.calledWith(1, 0, 1))

  spy.restore()
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

test.serial('messageEvent', (t) => {
  const agent = new Agent({
    Eris: PDiscord,
    chData
  })

  return agent._onReady(agent._client).then(async () => {
    const messages = {
      proper: new PDiscord.Message('!command1'),
      bot: new PDiscord.Message('!command1'),
      error: new PDiscord.Message('!commanderrortest'),
      createMessageError: new PDiscord.Message('!command1')
    }
    messages.bot.author.bot = true
    for (const message in messages) sinon.spy(messages[message].channel, 'createMessage')

    const handlerSpy = sinon.spy(agent._CommandHandler, 'handle')

    agent._client.emit('messageCreate', messages.proper)
    t.true(handlerSpy.calledWith(messages.proper), 'Proper command')

    agent._client.emit('messageCreate', messages.bot)
    t.false(handlerSpy.calledWith(messages.bot), 'Bot message')

    await agent._onCreateMessage(agent._client, messages.error)
    t.is(messages.error.channel.createMessage.getCall(0).args[0], 'ERR:```\n' + errorTest.message + '```\n```\n' + errorTest.stack + '```', 'Command error')

    messages.createMessageError.channel._createMessageThrow = true
    await agent._onCreateMessage(agent._client, messages.createMessageError)
    t.is(t.context.spies.error.getCall(0).args[0].message, 'This is purposefully thrown', 'Error send failure')
    t.is(t.context.spies.error.getCall(1).args[0], 'Error in error handler: ', 'Error send failure message fail pt. 1')
    t.is(t.context.spies.error.getCall(1).args[1].message, 'This is purposefully thrown', 'Error send failure message fail pt. 2')

    for (const message in messages) messages[message].channel.createMessage.restore()
    return handlerSpy.restore()
  })
})

test.serial('lastMessage', (t) => {
  const agent = new Agent({
    Eris: PDiscord
  })

  const guild = agent._client._createGuild('1')
  const channel = agent._client._createChannel('1', guild)

  agent._client._sendMessage('hello', agent._client.user, channel)

  t.is(agent.lastMessage(channel).content, 'hello')
})

test.serial('ErisErrorRecievedEvent', (t) => {
  const error = new Error('This is a test error')
  const agent = new Agent({
    Eris: PDiscord
  })

  agent._client.emit('error', error)

  t.true(t.context.spies.error.calledWith('An error has occured', error))
})

test.serial('disconnection', async (t) => {
  const agent = new Agent({
    Eris: PDiscord
  })

  const statusSpy = sinon.spy(agent._client.shards.get(0), 'editStatus')
  const connectSpy = sinon.spy(agent, 'connect')

  agent._client._setConnectStatus(true)
  await agent.connect()
  t.true(statusSpy.calledWith({
    name: 'Prefix: \'!\'',
    type: 2
  }), 'Status edited')

  agent._client.emit('shardDisconnect', 0)

  t.true(t.context.spies.log.calledWith('Shard 0 lost connection'), 'Disconnection logged')
  t.true(connectSpy.calledTwice, 'Reconnected')

  connectSpy.restore()
  statusSpy.restore()
})

test.serial('logFunction', async (t) => {
  const agent = new Agent({
    Eris: PDiscord,
    chData,
    agentOptions: {
      logFunction: (msg, { content }) => msg.timestamp + ' ' + content
    }
  })
  agent._client._setConnectStatus(true)
  await agent.connect()

  const message = new PDiscord.Message('!command1')

  await agent._onCreateMessage(agent._client, message)

  t.true(t.context.spies.log.calledWith(message.timestamp + ' 1'))
})

test.after.always(() => {
  const knex = new QueryBuilder({
    connection: DATABASE_URL,
    client: 'pg',
    pool: {
      min: 1,
      max: 1
    }
  })

  return knex.dropTable('cycloneagenttesting').catch((ignore) => ignore)
})
