import test from 'ava'
import sinon from 'sinon'
import CommandHandler from '.'
import PDiscord from '../../../test/pdc.js'
import QueryBuilder from 'simple-knex'
import Command from '../command'
import Replacer from '../replacer'
import Await from '../await'

require('dotenv').config()

const dGuild = new PDiscord.Guild('1')
const dChannel = new PDiscord.Channel('1', dGuild)
const dOTChannel = new PDiscord.Channel('2', dGuild)
const dOwner = new PDiscord.User('1')
const dUser = new PDiscord.User('2')

const client = new PDiscord('123', dOwner)
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
    name: 'longmessagetest',
    desc: "Testing when a command returns a string that reaches Discord's limit",
    action: () => '1'.repeat(2001)
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
      dbTable: 'cyclonetesting'
    },
    action: ({ userData }) => userData.id
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
    options: {
      args: [{ name: 'number', mand: true }]
    },
    action: ({ args: [number] }) => 'r3 ' + String(parseInt(number) + 1)
  })
]

const handler = new CommandHandler({
  client,
  ownerID: '1',
  knex,
  commands: mockCommands,
  replacers: mockReplacers
})

async function _prepareDatabases () {
  if (!(await knex.listTables()).includes('cyclonetesting')) {
    return knex.createTable({
      name: 'cyclonetesting',
      columns: [
        {
          name: 'id',
          type: 'string',
          primary: true
        }
      ]
    }).then(async ({ name }) => {
      if (!(await knex.select(name)).length) {
        return knex.insert({
          table: name,
          data: {
            id: '1'
          }
        })
          .catch((ignore) => ignore)
          .then(() => {
            return knex.insert({
              table: name,
              data: {
                id: '2'
              }
            }).catch((ignore) => ignore)
          })
      }
    })
  }
}

function delay (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

test('invalidSimple-KnexSupply', (t) => {
  const fakeHandler = new CommandHandler({
    client,
    ownerId: '456',
    commands: mockCommands,
    replacers: mockReplacers
  })

  return t.throwsAsync(fakeHandler.handle(new PDiscord.Message('!dbtest', dUser)), {
    instanceOf: Error,
    message: 'QueryBuilder was not supplied to CommandHandler!'
  })
})

test('invalidCommandInstance', (t) => {
  let error
  const invalidCommand = true
  try {
    error = new CommandHandler({
      client,
      ownerId: '456',
      commands: invalidCommand
    })
  } catch (err) {
    error = err
  }

  t.deepEqual(error, TypeError('Supplied command not Command instance:\n' + undefined))
})

test('invalidReplacerInstance', (t) => {
  let error
  const invalidReplacer = true
  try {
    error = new CommandHandler({
      client,
      ownerId: '456',
      replacers: invalidReplacer
    })
  } catch (err) {
    error = err
  }

  t.deepEqual(error, TypeError('Supplied replacer not Replacer instance:\n' + undefined))
})

test('openingReplacerBraceIncludesPrefix', (t) => {
  const spy = sinon.spy(console, 'log')

  const fakeHandler = new CommandHandler({
    client,
    ownerId: '456',
    replacerBraces: {
      open: '!['
    }
  })

  t.true(spy.calledWith('WARNING: Your replacer opening brace starts with your prefix. This could lead to some issues.'))

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
  t.is(await handler.handle(new PDiscord.Message('command1')), undefined, 'No prefix failed')

  t.is((await handler.handle(new PDiscord.Message('!command1'))).content, '1', 'Command 1 ran')

  const fakeHandler = new CommandHandler({
    prefix: '<>',
    client,
    ownerId: '456',
    commands: mockCommands
  })

  t.is((await fakeHandler.handle(new PDiscord.Message('<>command1'))).content, '1', 'Custom prefix')
})

test('mentionPrefix', async (t) => {
  t.is((await handler.handle(new PDiscord.Message(`<@${client.user.id}>command1`))).content, '1', 'No space')

  t.is((await handler.handle(new PDiscord.Message(`<@${client.user.id}> command1`))).content, '1', 'With space')
})

test('commandDiscrimination', async (t) => {
  t.is((await handler.handle(new PDiscord.Message('!command1'))).content, '1', 'Command 1 ran')

  t.is((await handler.handle(new PDiscord.Message('!command2'))).content, '2', 'Command 2 ran')

  const spyMessage = new PDiscord.Message('!command1')
  const spy = sinon.spy(spyMessage.channel, 'createMessage')

  await handler.handle(spyMessage)

  t.true(spy.calledWith({ content: '1', embed: undefined }, undefined), 'Response sent to channel')

  spy.restore()
})

test('commandHitsMaxLength', async (t) => {
  const command = new PDiscord.Message('!longmessagetest')
  const spy = sinon.spy(command.channel, 'createMessage')
  await handler.handle(command)

  t.true(spy.calledWith('Text was too long, sent as a file instead.', {
    name: 'Command Result.txt',
    file: Buffer.from(`${'1'.repeat(2001)}\n\nundefined`)
  }))

  spy.restore()
})

test('emptyAction', async (t) => {
  const {
    command,
    content,
    embed,
    file,
    rsp
  } = await handler.handle(new PDiscord.Message('!emptyaction'))
  t.is(command, mockCommands.find((c) => c.name === 'emptyaction'))
  t.is(content, undefined)
  t.is(embed, undefined)
  t.is(file, undefined)
  t.is(rsp, undefined)
})

test('incompleteReturnObject', async (t) => {
  t.truthy((await handler.handle(new PDiscord.Message('!justembed'))).embed, 'Embed passed')

  t.truthy((await handler.handle(new PDiscord.Message('!justfile'))).file, 'File passed')

  t.is(await handler.handle(new PDiscord.Message('!emptyobject')), undefined, 'Empty object')
})

test('invalidFileSupply', (t) => {
  return t.throwsAsync(handler.handle(new PDiscord.Message('!invalidfile')), {
    instanceOf: TypeError,
    message: 'Supplied file not a Buffer instance:\n'
  })
})

test('argumentSystem', async (t) => {
  t.is((await handler.handle(new PDiscord.Message('!argstest hello there'))).content, 'hello there undefined', 'Only mandatory args')

  await t.throwsAsync(handler.handle(new PDiscord.Message('!argstest hello')), {
    instanceOf: Error,
    message: 'Invalid arguments. Reference the help menu.'
  }, 'Missing arg')

  t.is((await handler.handle(new PDiscord.Message('!argstest hello there|sir'))).content, 'hello there sir', 'Custom Delim')

  await t.throwsAsync(handler.handle(new PDiscord.Message('!argstest')), {
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
  t.is((await handler.handle(new PDiscord.Message('!echo h|replacer1| l |replacer2|'))).content, 'hr1 l r2', 'Replacer differenciation')

  t.is((await handler.handle(new PDiscord.Message('!echo h|invalid| l |replacer2|'))).content, 'hINVALID KEY l r2', 'Invalid Replacer')

  t.is((await handler.handle(new PDiscord.Message('!echo hello |replacer3 1| there'))).content, 'hello r3 2 there', 'Replacer with args')

  t.is((await handler.handle(new PDiscord.Message('!echo hello |replacer3| there'))).content, 'hello INVALID ARGS there', 'Incorrect args')

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

  t.is((await fakeHandler.handle(new PDiscord.Message('!echo h<replacer1> l <replacer2>'))).content, 'hr1 l r2', 'Custom replacer braces')
})

test('databaseRequesting', (t) => {
  return _prepareDatabases().then(async () => {
    t.is((await handler.handle(new PDiscord.Message('!dbtest', dOwner))).content, '1', 'User 1')

    return t.is((await handler.handle(new PDiscord.Message('!dbtest', dUser))).content, '2', 'User 2')
  })
})

test('awaitSystem', async (t) => {
  t.is((await handler.handle(new PDiscord.Message('!awaittest', dUser, dChannel))).content, 'first', 'Any message pt. 1')
  t.is((await handler.handle(new PDiscord.Message('anything', dUser, dChannel))).content, 'second', 'Any message pt. 2')

  t.is((await handler.handle(new PDiscord.Message('!awaittest 1', dUser, dChannel))).content, 'first', 'Wrong user pt. 1')
  t.is(await handler.handle(new PDiscord.Message('!runawait 1', dOwner, dChannel)), undefined, 'Wrong user pt. 2')

  t.is((await handler.handle(new PDiscord.Message('!awaittest 1', dUser, dChannel))).content, 'first', 'Conditional await fail pt. 1')
  t.is(await handler.handle(new PDiscord.Message('!runawait 2', dUser, dChannel)), undefined, 'Conditional await fail pt. 2')

  t.is((await handler.handle(new PDiscord.Message('!awaittest 1', dUser, dChannel))).content, 'first', 'Conditional await success pt. 1')
  t.is((await handler.handle(new PDiscord.Message('!runawait 1', dUser, dChannel))).content, 'second', 'Conditional await success pt. 2')

  t.is((await handler.handle(new PDiscord.Message('!awaittest 1 100', dUser, dChannel))).content, 'first', 'Timeout await fail pt.1')
  await delay(200)
  t.is(await handler.handle(new PDiscord.Message('!runawait 1', dUser, dChannel)), undefined, 'Timeout await fail pt.2')

  t.is((await handler.handle(new PDiscord.Message('!awaittest 1 2000', dUser, dChannel))).content, 'first', 'Timeout await success pt.1')
  t.is((await handler.handle(new PDiscord.Message('!runawait 1', dUser, dChannel))).content, 'second', 'Timeout await success pt.2')

  t.is((await handler.handle(new PDiscord.Message('!awaittest 1 2000', dUser, dOTChannel))).content, 'first', 'oneTime await fail pt.1')
  t.is(await handler.handle(new PDiscord.Message('!runawait 2', dUser, dOTChannel)), undefined, 'oneTime await fail pt.2')
  t.is(await handler.handle(new PDiscord.Message('!runawait 1', dUser, dOTChannel)), undefined, 'oneTime await fail pt.3')

  t.is((await handler.handle(new PDiscord.Message('!awaittest 1 2000', dUser, dOTChannel))).content, 'first', 'oneTime await success pt.1')
  t.is((await handler.handle(new PDiscord.Message('!runawait 1', dUser, dOTChannel))).content, 'second', 'oneTime await success pt.2')
})

test('restrictedCommands', async (t) => {
  await t.throwsAsync(handler.handle(new PDiscord.Message('!testrestricted', dUser)), {
    instanceOf: Error,
    message: 'This command is either temporarily disabled, or restricted.'
  }, 'Successful denial')

  t.is((await handler.handle(new PDiscord.Message('!testrestricted', dOwner))).content, '3', 'Successful grant')
})

test('createMessageFailRejects', (t) => {
  const guild = handler._client._createGuild()
  const channel = handler._client._createChannel(undefined, guild)
  const message = handler._client._sendMessage('!command1', undefined, channel)

  channel._createMessageThrow = true

  return t.throwsAsync(handler.handle(message), {
    instanceOf: Error,
    message: 'This is purposefully thrown'
  })
})

test.after.always((t) => knex.dropTable('cyclonetesting').catch((ignore) => ignore))
