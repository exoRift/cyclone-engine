import test from 'ava'
import sinon from 'sinon'
import CommandHandler from '.'
import PDiscord from '../pdc.js'
import QueryBuilder from 'simple-knex'
import Command from '../command'
import Replacer from '../replacer'
import Await from '../await'

require('dotenv').config()

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
    name: 'emptyaction',
    desc: 'A command with no return in the action',
    action: () => {
      'Not returning'
    }
  }),
  new Command({
    name: 'justembed',
    desc: 'A command that just returns an embed',
    action: () => {
      return {
        embed: {}
      }
    }
  }),
  new Command({
    name: 'justfile',
    desc: 'A command that just returns a file',
    action: () => {
      return {
        file: Buffer.from('buffer')
      }
    }
  }),
  new Command({
    name: 'emptyobject',
    desc: 'A command that returns an empty object',
    action: () => {
      return {}
    }
  }),
  new Command({
    name: 'invalidfile',
    desc: "A command that doesn't return a buffer for file",
    action: () => {
      return {
        file: 'not a buffer'
      }
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
      args: [{ name: 'check' }, { name: 'timeout' }]
    },
    action: ({ msg, args: [check, timeout] }) => {
      return {
        content: 'first',
        wait: new Await({
          options: {
            check: check ? ({ msg }) => msg.content.startsWith('!runawait') && msg.content.split(' ')[1] === check : undefined,
            timeout: timeout ? parseInt(timeout) : undefined,
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
  }),
  new Replacer({
    key: 'replacer3',
    desc: 'A replacer that has an input',
    action: ({ capture }) => 'r3 ' + capture.split(' ')[1],
    start: true
  })
]

const handler = new CommandHandler({
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

test('invalidSimple-KnexSupply', async (t) => {
  const fakeHandler = new CommandHandler({
    client,
    ownerId: '456',
    commands: mockCommands,
    replacers: mockReplacers
  })

  await t.throwsAsync(fakeHandler.handle(client._buildMessage('!dbtest', '1')), {
    instanceOf: Error,
    message: 'QueryBuilder was not supplied to CommandHandler!'
  })
})

test('invalidCommandInstance', (t) => {
  let error
  let invalidCommand = true
  try {
    invalidCommand = new CommandHandler({
      client,
      ownerId: '456',
      commands: invalidCommand
    })
  } catch (err) {
    error = err
  }
  t.deepEqual(error, TypeError('Supplied commands not Command instances:\n', invalidCommand))
})

test('invalidReplacerInstance', (t) => {
  let error
  let invalidReplacer = true
  try {
    invalidReplacer = new CommandHandler({
      client,
      ownerId: '456',
      replacers: invalidReplacer
    })
  } catch (err) {
    error = err
  }
  t.deepEqual(error, TypeError('Supplied replacers not Replacer instances:\n', invalidReplacer))
})

test('openingReplacerBraceIncludesPrefix', (t) => {
  const spy = sinon.spy(console, 'log')

  const fakeHandler = new CommandHandler({
    client,
    ownerId: '456',
    replacerBraces: {
      open: '[!'
    }
  })

  t.true(spy.calledWith('WARNING: Your replacer opening brace includes your prefix. This could lead to some issues.'))

  spy.restore()

  return fakeHandler
})

test('singleDataSupply', (t) => {
  const singleCommand = new Command({
    name: 'command',
    desc: 'This is a single command',
    action: () => ''
  })
  const singleReplacer = new Replacer({
    key: 'replacer',
    desc: 'This is a single replacer',
    action: () => ''
  })

  const fakeHandler = new CommandHandler({
    client,
    ownerId: '456',
    commands: singleCommand,
    replacers: singleReplacer
  })

  t.truthy(fakeHandler._commands.get('command'), 'Command')
  t.truthy(fakeHandler._replacers.get('replacer'), 'Replacer')
})

test('prefixDetermination', async (t) => {
  t.is(await handler.handle(client._buildMessage('command1')), undefined, 'No prefix failed')

  t.is((await handler.handle(client._buildMessage('!command1'))).content, '1', 'Command 1 ran')

  const fakeHandler = new CommandHandler({
    prefix: '<>',
    client,
    ownerId: '456',
    commands: mockCommands
  })

  t.is((await fakeHandler.handle(client._buildMessage('<>command1'))).content, '1', 'Custom prefix')
})

test('mentionPrefix', async (t) => {
  t.is((await handler.handle(client._buildMessage(`<@${client.user.id}>command1`))).content, '1', 'No space')

  t.is((await handler.handle(client._buildMessage(`<@${client.user.id}> command1`))).content, '1', 'With space')
})

test('commandDiscrimination', async (t) => {
  t.is((await handler.handle(client._buildMessage('!command1'))).content, '1', 'Command 1 ran')

  t.is((await handler.handle(client._buildMessage('!command2'))).content, '2', 'Command 2 ran')
})

test('emptyAction', async (t) => {
  t.is(await handler.handle(client._buildMessage('!emptyaction')), undefined)
})

test('incompleteReturnObject', async (t) => {
  t.truthy((await handler.handle(client._buildMessage('!justembed'))).embed, 'Embed passed')

  t.truthy((await handler.handle(client._buildMessage('!justfile'))).file, 'File passed')

  t.is(await handler.handle(client._buildMessage('!emptyobject')), undefined, 'Empty object')
})

test('invalidFileSupply', async (t) => {
  await t.throwsAsync(handler.handle(client._buildMessage('!invalidfile')), {
    instanceOf: TypeError,
    message: 'Supplied file not a Buffer instance:\n'
  })
})

test('argumentSystem', async (t) => {
  t.is((await handler.handle(client._buildMessage('!argstest hello there'))).content, 'hello there undefined', 'Only mandatory args')

  await t.throwsAsync(handler.handle(client._buildMessage('!argstest hello')), {
    instanceOf: Error,
    message: 'Invalid arguments. Reference the help menu.'
  }, 'Missing arg')

  t.is((await handler.handle(client._buildMessage('!argstest hello there|sir'))).content, 'hello there sir', 'Custom Delim')

  await t.throwsAsync(handler.handle(client._buildMessage('!argstest')), {
    instanceOf: Error,
    message: 'Invalid arguments. Reference the help menu.'
  }, 'No args')
})

test('lastArgOfCommandHasDelim', (t) => {
  const fakeCommand = new Command({
    name: 'lastargdelimtest',
    desc: 'Testing when the last arg has a delim',
    options: {
      args: [{ name: 'arg', delim: '|' }]
    },
    action: () => ''
  })

  const spy = sinon.spy(console, 'log')

  const fakeHandler = new CommandHandler({
    client,
    ownerId: '456',
    commands: fakeCommand
  })

  t.true(spy.calledWith("Disclaimer: Your command: lastargdelimtest's last argument unnecessarily has a delimiter."))

  spy.restore()

  return fakeHandler
})

test('replacerSystem', async (t) => {
  t.is((await handler.handle(client._buildMessage('!echo h|replacer1| l |replacer2|'))).content, 'hr1 l r2', 'Replacer differenciation')

  t.is((await handler.handle(client._buildMessage('!echo h|invalid| l |replacer2|'))).content, 'hINVALID KEY l r2', 'Invalid Replacer')

  t.is((await handler.handle(client._buildMessage('!echo hello |replacer3 MESSAGE| there'))).content, 'hello r3 MESSAGE there', 'Replacer with args')

  const fakeHandler = new CommandHandler({
    client,
    ownerId: '456',
    commands: mockCommands,
    replacers: mockReplacers,
    replacerBraces: {
      open: '<',
      close: '>'
    }
  })

  t.is((await fakeHandler.handle(client._buildMessage('!echo h<replacer1> l <replacer2>'))).content, 'hr1 l r2', 'Custom replacer braces')
})

test('databaseRequesting', (t) => {
  return _prepareDatabases().then(async () => {
    t.is((await handler.handle(client._buildMessage('!dbtest', '1'))).content, '1', 'User 1')

    t.is((await handler.handle(client._buildMessage('!dbtest', '2'))).content, '2', 'User 2')
  })
})

test('awaitSystem', async (t) => {
  t.is((await handler.handle(client._buildMessage('!awaittest', '1', '1'))).content, 'first', 'Any message pt. 1')
  t.is((await handler.handle(client._buildMessage('anything', '1', '1'))).content, 'second', 'Any message pt. 2')

  t.is((await handler.handle(client._buildMessage('!awaittest 1', '1', '1'))).content, 'first', 'Wrong user pt. 1')
  t.is(await handler.handle(client._buildMessage('!runawait 1', '2', '1')), undefined, 'Wrong user pt. 2')

  t.is((await handler.handle(client._buildMessage('!awaittest 1', '1', '1'))).content, 'first', 'Conditional await fail pt. 1')
  t.is(await handler.handle(client._buildMessage('!runawait 2', '1', '1')), undefined, 'Conditional await fail pt. 2')

  t.is((await handler.handle(client._buildMessage('!awaittest 1', '1', '1'))).content, 'first', 'Conditional await success pt. 1')
  t.is((await handler.handle(client._buildMessage('!runawait 1', '1', '1'))).content, 'second', 'Conditional await success pt. 2')

  t.is((await handler.handle(client._buildMessage('!awaittest 1 100', '1', '1'))).content, 'first', 'Timeout await fail pt.1')
  await delay(200)
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
  t.throwsAsync(handler.handle(client._buildMessage('!testrestricted', '123')), {
    instanceOf: Error,
    message: 'This command is either temporarily disabled, or restricted.'
  }, 'Successful denial')

  t.is((await handler.handle(client._buildMessage('!testrestricted', '456'))).content, '3', 'Successful grant')
})
