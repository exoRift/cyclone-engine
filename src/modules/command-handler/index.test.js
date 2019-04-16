import test from 'ava'
import CommandHandler from '.'
import PDiscord from '../pdc.js'
import QueryBuilder from 'simple-knex'
import Command from '../command'
import Replacer from '../replacer'
import Await from '../await'

const client = new PDiscord()
const knex = new QueryBuilder({
  connection: process.env.DATABASE_URL,
  client: 'pg',
  pool: {
    min: 1,
    max: 1
  }
})

const mockCommands = [
  new Command({
    name: 'command1',
    desc: 'Test command 1',
    action: () => '1'
  }),
  new Command({
    name: 'command2',
    desc: 'Test command 2',
    action: () => '2'
  }),
  new Command({
    name: 'testrestricted',
    desc: 'Testing restricted commands',
    action: () => '3',
    options: {
      restricted: true
    }
  }),
  new Command({
    name: 'echo',
    desc: 'Echo what was said',
    options: {
      args: [{ name: 'content', mand: true }]
    },
    action: ({ args: [content] }) => content
  }),
  new Command({
    name: 'dbtest',
    desc: 'Requires the database',
    options: {
      dbTable: 'testing'
    },
    action: ({ testing }) => {
      return testing.id
    }
  }),
  new Command({
    name: 'argstest',
    desc: 'Testing args',
    options: {
      args: [{ name: 'mandatoryArg', mand: true }, { name: 'customDelimArg', delim: '|', mand: true }, { name: 'optionalArg' }]
    },
    action: ({ args: [mandatoryArg, customDelimArg, optionalArg] }) => `${mandatoryArg} ${customDelimArg} ${optionalArg}`
  }),
  new Command({
    name: 'awaittest',
    desc: 'Test the awaited message system',
    options: {
      args: [{ name: 'check', mand: true }, { name: 'timeout' }]
    },
    action: ({ msg, args: [check, timeout] }) => {
      return {
        content: 'first',
        wait: new Await({
          options: {
            check: ({ msg }) => msg.content.startsWith('!runawait') && msg.content.split(' ')[1] === check,
            timeout: parseInt(timeout),
            oneTime: msg.channel.id === '2'
          },
          action: () => 'second'
        })
      }
    }
  })
]

const mockReplacers = [
  new Replacer({
    key: 'replacer1',
    desc: 'Test replacer 1',
    action: () => 'r1'
  }),
  new Replacer({
    key: 'replacer2',
    desc: 'Test replacer 2',
    action: () => 'r2'
  })
]

const handler = new CommandHandler({
  agent: {},
  prefix: '!',
  client,
  ownerId: '456',
  knex,
  commands: mockCommands,
  replacers: mockReplacers
})

async function _prepareDatabases () {
  if (!(await knex.listTables()).includes('testing')) {
    return knex.createTable({
      name: 'testing',
      columns: [
        {
          name: 'id',
          type: 'string',
          primary: true
        }
      ]
    }).then(async ({ name }) => {
      if (await knex.select('testing').length) {
        knex.insert({ table: name,
          data: {
            id: '1'
          }
        }).then(() => {
          knex.insert({ table: name,
            data: {
              id: '2'
            }
          })
        })
      }
    })
  }
}

function delay (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

test('prefixDetermination', async (t) => {
  t.is(await handler.handle(client._buildMessage('command1')), undefined, 'No prefix failed')

  t.is((await handler.handle(client._buildMessage('!command1'))).content, '1', 'Command 1 ran')
})

test('mentionPrefix', async (t) => {
  t.is((await handler.handle(client._buildMessage(`<@${client.user.id}>command1`))).content, '1', 'No space')
  t.is((await handler.handle(client._buildMessage(`<@${client.user.id}> command1`))).content, '1', 'With space')
})

test('commandDiscrimination', async (t) => {
  t.is((await handler.handle(client._buildMessage('!command1'))).content, '1', 'Command 1 ran')

  t.is((await handler.handle(client._buildMessage('!command2'))).content, '2', 'Command 2 ran')
})

test('argumentSystem', async (t) => {
  t.is((await handler.handle(client._buildMessage('!argstest hello there'))).content, 'hello there undefined', 'Only mandatory args')

  await t.throwsAsync(handler.handle(client._buildMessage('!argstest hello')), Error, 'Missing arg')

  t.is((await handler.handle(client._buildMessage('!argstest hello there|sir'))).content, 'hello there sir', 'Custom Delim')

  await t.throwsAsync(handler.handle(client._buildMessage('!argstest')), Error, 'No args')
})

test('replacerSystem', async (t) => {
  t.is((await handler.handle(client._buildMessage('!echo h|replacer1| l |replacer2|'))).content, 'hr1 l r2')
})

test('databaseRequesting', (t) => {
  return _prepareDatabases().then(async () => {
    t.is((await handler.handle(client._buildMessage('!dbtest', '1'))).content, '1', 'User 1')

    t.is((await handler.handle(client._buildMessage('!dbtest', '2'))).content, '2', 'User 2')
  })
})

test('awaitSystem', async (t) => {
  t.is((await handler.handle(client._buildMessage('!awaittest 1', '1', '1'))).content, 'first', 'Wrong user pt. 1')
  t.is(await handler.handle(client._buildMessage('!runawait 1', '2', '1')), undefined, 'Wrong user pt. 2')

  t.is((await handler.handle(client._buildMessage('!awaittest 1', '1', '1'))).content, 'first', 'Conditional await fail pt. 1')
  t.is(await handler.handle(client._buildMessage('!runawait 2', '1', '1')), undefined, 'Conditional await fail pt. 2')

  t.is((await handler.handle(client._buildMessage('!awaittest 1', '1', '1'))).content, 'first', 'Conditional await success pt. 1')
  t.is((await handler.handle(client._buildMessage('!runawait 1', '1', '1'))).content, 'second', 'Conditional await success pt. 2')

  t.is((await handler.handle(client._buildMessage('!awaittest 1 1000', '1', '1'))).content, 'first', 'Timeout await fail pt.1')
  await delay(2000)
  t.is(await handler.handle(client._buildMessage('!runawait 1', '1', '1')), undefined, 'Timeout await fail pt.2')

  t.is((await handler.handle(client._buildMessage('!awaittest 1 2000', '1', '1'))).content, 'first', 'Timeout await success pt.1')
  t.is((await handler.handle(client._buildMessage('!runawait 1', '1', '1'))).content, 'second', 'Timeout await success pt.2')

  t.is((await handler.handle(client._buildMessage('!awaittest 1 2000', '1', '2'))).content, 'first', 'oneTime await fail pt.1')
  t.is(await handler.handle(client._buildMessage('!runawait 2', '1', '2')), undefined, 'oneTime await fail pt.2')
  t.is(await handler.handle(client._buildMessage('!runawait 1', '1', '2')), undefined, 'oneTime await fail pt.3')

  t.is((await handler.handle(client._buildMessage('!awaittest 1 2000', '1', '2'))).content, 'first', 'oneTime await success pt.1')
  t.is((await handler.handle(client._buildMessage('!runawait 1', '1', '2'))).content, 'second', 'oneTime await success pt.2')
})

test('restrictedCommands', async (t) => {
  t.throwsAsync(handler.handle(client._buildMessage('!testrestricted', '123')), Error, 'Successful denial')

  t.is((await handler.handle(client._buildMessage('!testrestricted', '456'))).content, '3', 'Successful grant')
})
