import test from 'ava'
import sinon from 'sinon'
import {
  inspect
} from 'util'
import PseudoClient from '../../../test/pdc.js'
import QueryBuilder from 'simple-knex'
import {
  _CommandHandler as CommandHandler,
  _ReactionHandler as ReactionHandler,
  Command,
  Replacer,
  Await,
  ReactCommand,
  ReactInterface
} from '../'
import InputError from './input-error.js'

require('dotenv').config()

const {
  DATABASE_URL
} = process.env

function delay (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

const knex = new QueryBuilder({
  connection: DATABASE_URL,
  client: 'pg',
  pool: {
    min: 1,
    max: 1
  }
})

const botOwner = new PseudoClient.User({ id: '1' })

const client = new PseudoClient(undefined, botOwner)

client._joinGuild({ guildData: { id: '0' }, channels: [{ id: '0' }] })

const dGuild = client.guilds.get('0')

const dChannel = dGuild.channels.get('0')
const otherChannel = dGuild._createChannel({ id: '1', name: 'otherChannel' })
const restrictedChannel = dGuild._createChannel({ id: '2', name: 'restrictedChannel' })
const nonTextChannel = dGuild._createChannel({ id: '3', name: 'restrictedChannel' })
nonTextChannel.type = 2

dChannel._setPermission(client.user.id, 'sendMessages', true)
dChannel._setPermission(botOwner.id, 'sendMessages', true)

otherChannel._setPermission(client.user.id, 'sendMessages', true)
otherChannel._setPermission(botOwner.id, 'sendMessages', true)

nonTextChannel._setPermission(client.user.id, 'sendMessages', true)
nonTextChannel._setPermission(botOwner.id, 'sendMessages', true)

const mockCommands = [
  new Command({
    name: 'c1',
    desc: 'Test command differenciation',
    action: () => 'command1'
  }),
  new Command({
    name: 'c2',
    desc: 'Test command differenciation',
    action: () => 'command2'
  }),
  new Command({
    name: 'dbtest',
    desc: 'Requires the database',
    options: {
      dbTable: 'cyclonecommandhandler'
    },
    action: ({ userData }) => userData.id
  }),
  new Command({
    name: 'longmessagetest',
    desc: 'Test long messages',
    action: () => 'f'.repeat(2001)
  }),
  new Command({
    name: 'longembedtest',
    desc: 'Test long embeds',
    action: () => {
      return {
        embed: {
          name: 'test',
          fields: [
            {
              name: 'test',
              value: 'f'.repeat(1025)
            }
          ]
        }
      }
    }
  }),
  new Command({
    name: 'invalidembed',
    desc: 'Testing invalid form bodies',
    action: () => {
      return {
        embed: {
          fields: [
            {
              value: 'f'
            }
          ]
        }
      }
    }
  }),
  new Command({
    name: 'emptyaction',
    desc: 'A command with no return in the action',
    action: () => undefined
  }),
  new Command({
    name: 'justembed',
    desc: 'A command with just an embed',
    action: () => {
      return {
        embed: {
          name: 'embed',
          fields: [
            {
              name: 'field',
              value: 'value'
            }
          ]
        }
      }
    }
  }),
  new Command({
    name: 'justfile',
    desc: 'A command with just a file',
    action: () => {
      return {
        file: {
          name: 'file',
          file: Buffer.from('file')
        }
      }
    }
  }),
  new Command({
    name: 'justdeleteafter',
    desc: 'A command that only passes the deleteAfter option',
    action: () => {
      return {
        options: {
          deleteAfter: 10
        }
      }
    }
  }),
  new Command({
    name: 'justreactinterface',
    desc: 'A command that only passes the reactInterface option',
    action: () => {
      return {
        options: {
          reactInterface: new ReactInterface({
            buttons: mockReactCommands
          })
        }
      }
    }
  }),
  new Command({
    name: 'deleteafter',
    desc: 'Test deleteAfter',
    action: () => {
      return {
        content: 'deleteafter',
        options: {
          deleteAfter: 100
        }
      }
    }
  }),
  new Command({
    name: 'invaliddeleteafter',
    desc: 'Test deleteAfter when not a number',
    action: () => {
      return {
        content: 'deleteafter',
        options: {
          deleteAfter: 'string'
        }
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
    name: 'reactinterface',
    desc: 'Testing react interfaces',
    action: () => {
      return {
        content: 'interface',
        options: {
          reactInterface: new ReactInterface({
            buttons: mockReactCommands
          })
        }
      }
    }
  }),
  new Command({
    name: 'invalidreactinterface',
    desc: 'Testing invalid react interface instances',
    action: () => {
      return {
        content: 'interface',
        options: {
          reactInterface: 'invalid'
        }
      }
    }
  }),
  new Command({
    name: 'invalidfileobject',
    desc: 'Return an invalid file object',
    action: () => {
      return {
        file: 'not a file object'
      }
    }
  }),
  new Command({
    name: 'invalidfile',
    desc: 'Return an invalid file',
    action: () => {
      return {
        file: {
          name: 'file',
          file: 'not a buffer'
        }
      }
    }
  }),
  new Command({
    name: 'argstest',
    desc: 'Testing args',
    options: {
      args: [{ name: 'mandatoryArg', mand: true }, { name: 'customDelimArg', delim: '|', mand: true }, { name: 'optionalArg' }, { name: 'numberArg', type: 'number' }]
    },
    action: ({ args: [mandatoryArg, customDelimArg, optionalArg, numberArg] }) => `${mandatoryArg}+${customDelimArg}+${optionalArg}-${numberArg}`
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
    name: 'awaittest',
    desc: 'Test the awaited message system',
    options: {
      args: [{ name: 'check' }, { name: 'timeout' }]
    },
    action: ({ msg, args: [check, timeout] }) => {
      return {
        content: 'first',
        options: {
          wait: new Await({
            options: {
              check: check ? ({ msg }) => msg.content.startsWith('!runawait') && msg.content.split(' ')[1] === check : undefined,
              timeout: timeout ? parseInt(timeout) : undefined,
              oneTime: msg.channel.id === otherChannel.id
            },
            action: () => 'second'
          })
        }
      }
    }
  }),
  new Command({
    name: 'justawait',
    desc: 'Return just an await',
    action: () => {
      return {
        options: {
          wait: new Await({
            action: () => 'awaited'
          })
        }
      }
    }
  }),
  new Command({
    name: 'invalidaction',
    desc: 'A command with an invalid action',
    action: 'invalid'
  }),
  new Command({
    name: 'invalidawaitaction',
    desc: 'A command that returns an await with an invalid action',
    action: () => {
      return {
        options: {
          wait: new Await({
            action: 'invalid'
          })
        }
      }
    }
  }),
  new Command({
    name: 'testrestricted',
    desc: 'A restricted command',
    options: {
      restricted: true
    },
    action: () => 'restricted message'
  }),
  new Command({
    name: 'aliastest',
    desc: 'Testing command aliases',
    options: {
      aliases: ['alias']
    },
    action: () => 'aliascontent'
  }),
  new Command({
    name: 'customchannel',
    desc: 'Testing a command that sends its response to a custom channel',
    action: () => {
      return {
        content: 'customchannelcontent',
        options: {
          channels: otherChannel.id
        }
      }
    }
  }),
  new Command({
    name: 'multipleresponses',
    desc: 'Testing a command that sends multiple responses',
    action: () => {
      return [{
        content: 'first'
      }, {
        content: 'second',
        options: {
          channels: otherChannel.id
        }
      }]
    }
  }),
  new Command({
    name: 'multiplechannels',
    desc: 'Testing a command that sends multiple messages to different channels',
    action: () => {
      return {
        content: 'multiple of this',
        options: {
          channels: [dChannel.id, otherChannel.id]
        }
      }
    }
  }),
  new Command({
    name: 'testmessagepermissions',
    desc: 'Testing a response directed at a restricted channel',
    action: () => {
      return {
        content: 'messagepermissioncontent',
        options: {
          channels: restrictedChannel.id
        }
      }
    }
  }),
  new Command({
    name: 'invalidawait',
    desc: 'A command that returns an invalid Await instance',
    action: () => {
      return {
        content: 'invalidawaitcontent',
        options: {
          wait: 'invalid'
        }
      }
    }
  }),
  new Command({
    name: 'testawaitrefresh',
    desc: 'Testing awaiting refreshing',
    action: () => {
      return {
        content: 'first',
        options: {
          wait: new Await({
            options: {
              refreshOnUse: true
            },
            action: () => 'second'
          })
        }
      }
    }
  }),
  new Command({
    name: 'testallthree',
    desc: 'Send all three message parameters',
    action: () => {
      return {
        content: 'allthreecontent',
        embed: {
          name: 'embed'
        },
        file: {
          name: 'file',
          file: Buffer.from('hello')
        }
      }
    }
  }),
  new Command({
    name: 'invalidchannel',
    desc: 'Send a message to an invalid channel',
    action: () => {
      return {
        content: 'invalidchannelcontent',
        options: {
          channels: 'invalid'
        }
      }
    }
  }),
  new Command({
    name: 'invalidchanneltype',
    desc: 'Send a message to a non-text channel',
    action: () => {
      return {
        content: 'invalidchanneltypecontent',
        options: {
          channels: nonTextChannel.id
        }
      }
    }
  }),
  new Command({
    name: 'triggerresponsetest',
    desc: 'Test triggerResponse passing for awaits',
    action: () => {
      return {
        content: 'first',
        options: {
          wait: new Await({
            action: ({ msg, triggerResponse }) => `${msg.content}: ${triggerResponse.content}`
          })
        }
      }
    }
  }),
  new Command({
    name: 'shiftcounttest',
    desc: 'Testing shiftCount for awaits',
    action: () => {
      return {
        content: 'first',
        options: {
          wait: new Await({
            options: {
              args: [{ name: 'arg', mand: true }],
              check: ({ prefix, msg }) => msg.content.startsWith(prefix + 'trigger'),
              shiftCount: 1
            },
            action: ({ args: [arg] }) => arg
          })
        }
      }
    }
  })
]

const mockReplacers = [
  new Replacer({
    key: 'r1',
    desc: 'Test replacer differenciation',
    action: () => 'replacer1'
  }),
  new Replacer({
    key: 'r2',
    desc: 'Test replacer differenciation',
    action: () => 'replacer2'
  }),
  new Replacer({
    key: 'r3',
    desc: 'A replacer that has arguments',
    options: {
      args: [{ name: 'number', mand: true }]
    },
    action: ({ args: [number] }) => 'replacer3 ' + String(parseInt(number) + 1)
  })
]

const mockReactCommands = [
  new ReactCommand({
    emoji: '🍕',
    desc: 'Testing react command differenciation',
    action: () => 'pizza'
  }),
  new ReactCommand({
    emoji: '🍨',
    desc: 'Testing react command differenciation',
    action: () => 'ice cream'
  })
]

const handler = new CommandHandler({
  client,
  ownerID: botOwner.id,
  knex,
  commands: mockCommands,
  replacers: mockReplacers
})

async function _prepareTable () {
  if (!(await knex.listTables()).includes('cyclonecommandhandler')) {
    return knex.createTable({
      name: 'cyclonecommandhandler',
      columns: [
        {
          name: 'id',
          type: 'string',
          primary: true
        }
      ]
    }).then(async ({ name }) => {
      if (!(await knex.select(name).length)) {
        return knex.insert({
          table: name,
          data: {
            id: client.user.id
          }
        })
          .catch((ignore) => ignore)
          .then(() => {
            return knex.insert({
              table: name,
              data: {
                id: botOwner.id
              }
            }).catch((ignore) => ignore)
          })
      }
    })
  }
}

test.serial('invalidSimple-KnexSupply', async (t) => {
  const fakeHandler = new CommandHandler({
    client,
    ownerId: botOwner.id,
    commands: mockCommands,
    replacers: mockReplacers
  })

  return t.throwsAsync(fakeHandler.handle(await dChannel.createMessage('!dbtest')), {
    instanceOf: Error,
    message: 'QueryBuilder was not supplied to CommandHandler! Attempted to fetch table:\ncyclonecommandhandler'
  })
})

test.serial('invalidCommandInstance', (t) => {
  let error

  const invalidCommand = 1

  try {
    error = new CommandHandler({
      client,
      ownerId: botOwner.id,
      commands: invalidCommand
    })
  } catch (err) {
    error = err
  }

  t.deepEqual(error, TypeError('Supplied command not a Command instance:\n1'))
})

test.serial('invalidReplacerInstance', (t) => {
  let error
  const invalidReplacer = true
  try {
    error = new CommandHandler({
      client,
      ownerId: botOwner.id,
      replacers: invalidReplacer
    })
  } catch (err) {
    error = err
  }

  t.deepEqual(error, TypeError('Supplied replacer not Replacer instance:\n' + undefined))
})

test.serial('invalidAwaitInstance', async (t) => {
  return t.throwsAsync(handler.handle(await dChannel.createMessage('!invalidawait')), {
    instanceOf: TypeError,
    message: 'Supplied wait is not an Await instance:\ninvalid'
  })
})

test.serial('openingReplacerBraceIncludesPrefix', (t) => {
  const spy = sinon.spy(console, 'log')

  const withoutReplacers = new CommandHandler({
    client,
    ownerId: botOwner.id,
    options: {
      replacerBraces: {
        open: '!['
      }
    }
  })

  t.false(spy.calledWith('WARNING: Your replacer opening brace starts with your prefix. This could lead to some issues.'), 'Without replacers')

  const withReplacers = new CommandHandler({
    client,
    ownerId: botOwner.id,
    options: {
      replacerBraces: {
        open: '!['
      }
    },
    replacers: mockReplacers
  })

  t.true(spy.calledWith('WARNING: Your replacer opening brace starts with your prefix. This could lead to some issues.'), 'With replacers')

  spy.restore()

  return { withoutReplacers, withReplacers }
})

test.serial('singleDataSupply', (t) => {
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
    ownerId: botOwner.id,
    commands: singleCommand,
    replacers: singleReplacer
  })

  t.truthy(fakeHandler._commands.get('command'), 'Command')
  t.truthy(fakeHandler._replacers.get('replacer'), 'Replacer')
})

test.serial('invalidCommandAction', async (t) => {
  return t.throwsAsync(handler.handle(await dChannel.createMessage('!invalidaction')), {
    instanceOf: TypeError,
    message: 'Command action is not a function:\ninvalidaction'
  })
})

test.serial('invalidAwaitAction', async (t) => {
  await handler.handle(await dChannel.createMessage('!invalidawaitaction'))

  await t.throwsAsync(handler.handle(await dChannel.createMessage('anything')), {
    instanceOf: TypeError,
    message: 'Command action is not a function:\nawaitID: 00'
  })

  handler._awaits.delete('00')
})

test.serial('prefixDetermination', async (t) => {
  t.is(await handler.handle(await dChannel.createMessage('c1')), undefined, 'No prefix failed')

  t.is((await handler.handle(await dChannel.createMessage('!c1'))).results[0].responses[0].content, 'command1', 'Command 1 ran')

  const fakeHandler = new CommandHandler({
    prefix: '<>',
    client,
    ownerId: botOwner.id,
    commands: mockCommands
  })

  t.is((await fakeHandler.handle(await dChannel.createMessage('<>c1'))).results[0].responses[0].content, 'command1', 'Custom prefix')
})

test.serial('mentionPrefix', async (t) => {
  t.is((await handler.handle(await dChannel.createMessage(`<@${client.user.id}>c1`))).results[0].responses[0].content, 'command1', 'No space')

  t.is((await handler.handle(await dChannel.createMessage(`<@${client.user.id}> c1`))).results[0].responses[0].content, 'command1', 'With space')
})

test.serial('commandDiscrimination', async (t) => {
  const command1 = await handler.handle(await dChannel.createMessage('!c1'))

  t.truthy(command1, 'Valid return')
  t.is(command1.results[0].responses[0].content, 'command1', 'Command 1 ran')

  t.is((await handler.handle(await dChannel.createMessage('!c2'))).results[0].responses[0].content, 'command2', 'Command 2 ran')

  const spyMessage = await dChannel.createMessage('!c1')
  const spy = sinon.spy(spyMessage.channel, 'createMessage')

  const {
    results
  } = await handler.handle(spyMessage)

  t.true(spy.calledWith({ content: 'command1', embed: undefined }, undefined), 'Response sent to channel')

  t.is(results.length, 1, 'Only 1 result')

  spy.restore()
})

test.serial('aliases', async (t) => {
  t.is((await handler.handle(await dChannel.createMessage('!aliastest'))).results[0].responses[0].content, 'aliascontent', 'Base name ran')

  t.is((await handler.handle(await dChannel.createMessage('!alias'))).results[0].responses[0].content, 'aliascontent', 'Alias ran')
})

test.serial('customChannel', async (t) => {
  await handler.handle(await dChannel.createMessage('!customchannel'))

  t.truthy(otherChannel.messages.find((m) => m.content === 'customchannelcontent'))
})

test.serial('multipleResponses', async (t) => {
  await handler.handle(await dChannel.createMessage('!multipleresponses'))

  t.truthy(dChannel.messages.find((m) => m.content === 'first'), 'First response')

  t.truthy(otherChannel.messages.find((m) => m.content === 'second'), 'Second response')
})

test.serial('multipleChannels', async (t) => {
  await handler.handle(await dChannel.createMessage('!multiplechannels'))

  t.truthy(dChannel.messages.find((m) => m.content === 'multiple of this'), 'Channel 1')

  t.truthy(otherChannel.messages.find((m) => m.content === 'multiple of this'), 'Channel 2')
})

test.serial('responseErrors', async (t) => {
  const longContent = await dChannel.createMessage('!longmessagetest')
  const longEmbed = await dChannel.createMessage('!longembedtest')
  const invalidEmbed = await dChannel.createMessage('!invalidembed')
  const spy = sinon.spy(dChannel, 'createMessage')

  await handler.handle(longContent)
  await handler.handle(longEmbed)
  await t.throwsAsync(handler.handle(invalidEmbed), {
    instanceOf: Error,
    name: 'DiscordRESTError [50035]',
    message: 'Invalid Form Body\n  embed.fields.0.name: This field is required',
    code: 50035
  }, 'Invalid form')

  t.true(spy.calledWith('Text was too long, sent as a file instead.', {
    name: 'Command Result.txt',
    file: Buffer.from(`${'f'.repeat(2001)}\n\nundefined`)
  }), 'Message too long')

  t.true(spy.calledWith('Text was too long, sent as a file instead.', {
    name: 'Command Result.txt',
    file: Buffer.from(`undefined\n\n${inspect({ name: 'test', fields: [{ name: 'test', value: 'f'.repeat(1025) }] })}`)
  }), 'Embed too long')

  spy.restore()
})

test.serial('ignoreCodes', async (t) => {
  const fakeHandler = new CommandHandler({
    agent: {},
    client,
    ownerID: botOwner.id,
    commands: mockCommands,
    options: {
      ignoreCodes: [101]
    }
  })

  const message = await dChannel.createMessage('!c1')

  dChannel._createMessageThrow = true
  const {
    results: [{ responses: [response] }]
  } = await fakeHandler.handle(message)

  t.true(response instanceof Error, 'Response is an error')
  t.is(response.message, 'ignoredError', 'Message matches')

  dChannel._createMessageThrow = false
})

test.serial('emptyAction', async (t) => {
  t.deepEqual(await handler.handle(await dChannel.createMessage('!emptyaction')), {
    command: mockCommands.find((c) => c.name === 'emptyaction'),
    results: [undefined]
  })
})

test.serial('partialReturnObject', async (t) => {
  const {
    results: [{ responses: [contentResponse] }]
  } = await handler.handle(await dChannel.createMessage('!c1'))
  t.is(contentResponse.content, 'command1', 'Just content pt. 1')
  t.is(contentResponse.embeds.length, 0, 'Just content pt. 2')
  t.is(contentResponse.attachments.length, 0, 'Just content pt. 3')

  const {
    results: [{ responses: [embedResponse] }]
  } = await handler.handle(await dChannel.createMessage('!justembed'))
  t.is(embedResponse.content, undefined, 'Just embed pt. 1')
  t.deepEqual(embedResponse.embeds, [{ name: 'embed', fields: [{ name: 'field', value: 'value' }] }], 'Just embed pt. 2')
  t.is(embedResponse.attachments.length, 0, 'Just embed pt. 3')

  const {
    results: [{ responses: [fileResponse] }]
  } = await handler.handle(await dChannel.createMessage('!justfile'))
  t.is(fileResponse.content, undefined, 'Just file pt. 1')
  t.is(fileResponse.embeds.length, 0, 'Just file pt. 2')
  t.deepEqual(fileResponse.attachments, [{ filename: 'file', url: `https://cdn.discordapp.com/attachments/${dGuild.id}/${dChannel.id}/file` }], 'Just file pt. 3a')
  t.deepEqual(fileResponse._attachmentFile, Buffer.from('file'), 'Just file pt. 3b')

  const {
    results: emptyResults
  } = await handler.handle(await dChannel.createMessage('!emptyobject'))

  t.deepEqual(emptyResults, [{
    options: {
      channels: ['0']
    },
    responses: [undefined]
  }], 'Empty object')

  const {
    results: waitResults
  } = await handler.handle(await dChannel.createMessage('!justawait'))

  t.true(waitResults[0].options.wait instanceof Await, 'Just await')

  handler._awaits.delete('00')
})

test.serial('fullReturnObject', async (t) => {
  const {
    results: [{ responses: [response] }]
  } = await handler.handle(await dChannel.createMessage('!testallthree'))

  t.is(response.content, 'allthreecontent', 'Content')

  t.deepEqual(response.embeds, [{
    name: 'embed'
  }], 'Embed')

  t.deepEqual(response.attachments, [{
    filename: 'file',
    url: `https://cdn.discordapp.com/attachments/${dGuild.id}/${dChannel.id}/file`
  }], 'File')
})

test.serial('invalidChannel', async (t) => {
  const {
    results: [{ responses: [response] }]
  } = await handler.handle(await dChannel.createMessage('!invalidchannel'))

  t.true(response instanceof Error, 'Response is an error')
  t.is(response.message, 'invalidChannel')
})

test.serial('invalidChannelType', async (t) => {
  const {
    results: [{ responses: [response] }]
  } = await handler.handle(await dChannel.createMessage('!invalidchanneltype'))

  t.true(response instanceof Error, 'Response is an error')
  t.is(response.message, 'channelType')
})

test.serial('noSendMessagePermission', async (t) => {
  const {
    results: [{ responses: [response] }]
  } = await handler.handle(await dChannel.createMessage('!testmessagepermissions'))

  t.true(response instanceof Error, 'Response is an error')
  t.is(response.message, 'channelPermissions')
})

test.serial('deleteAfter', async (t) => {
  await handler.handle(await dChannel.createMessage('!deleteafter'))

  t.truthy(dChannel.messages.find((m) => m.content === 'deleteafter'), 'Message was sent')

  await delay(150)

  t.is(dChannel.messages.find((m) => m.content === 'deleteafter'), undefined, 'Message deleted')

  await t.throwsAsync(handler.handle(await dChannel.createMessage('!invaliddeleteafter')), {
    instanceOf: Error,
    message: 'Supplied deleteAfter delay is not a number:\nstring'
  }, 'Not a number throws')
})

test.serial('deleteAfterWhenMessageAlreadyDeleted', async (t) => {
  const {
    results: [{ responses: [response] }]
  } = await handler.handle(await dChannel.createMessage('!deleteafter'))

  t.truthy(dChannel.messages.find((m) => m.content === 'deleteafter'), 'Message was sent')

  await response.delete()

  sinon.spy(response, 'delete')
  const uncaughtSpy = sinon.spy()

  process.on('uncaughtException', uncaughtSpy)
  await delay(150)

  t.true(response.delete.calledOnce, 'Delete called')

  t.true(uncaughtSpy.notCalled, 'Rejection caught')
})

test.serial('reactInterfaces', async (t) => {
  const noReactionHandler = new CommandHandler({
    client,
    ownerID: botOwner.id,
    commands: mockCommands
  })
  const _reactionHandler = new ReactionHandler({
    client,
    ownerID: botOwner.id
  })
  const yesReactionHandler = new CommandHandler({
    agent: {
      _reactionHandler
    },
    client,
    ownerID: botOwner.id,
    commands: mockCommands
  })
  yesReactionHandler._agent._commandHandler = yesReactionHandler
  _reactionHandler._agent = yesReactionHandler._agent

  const {
    results: [{
      responses: [interfaceMsg]
    }]
  } = await yesReactionHandler.handle(await dChannel.createMessage('!reactinterface'))

  t.deepEqual(yesReactionHandler._agent._reactionHandler._reactInterfaces.get(interfaceMsg.id), new ReactInterface({
    buttons: mockReactCommands
  }), 'Interface stored in reaction handler')
  t.truthy(interfaceMsg.reactions['🍕'], 'Message has pizza button')
  t.truthy(interfaceMsg.reactions['🍨'], 'Message has ice cream button')

  return t.throwsAsync(noReactionHandler.handle(await dChannel.createMessage('!reactinterface')), {
    instanceOf: Error,
    message: 'The reaction handler isn\'t enabled; enable it by passing an empty array to Agent.handlerData.reactCommands'
  }, 'No reaction handler')
})

test.serial('failOnMsgSpecificOptionsWithNoMessage', async (t) => {
  await t.throwsAsync(handler.handle(await dChannel.createMessage('!justdeleteafter')), {
    instanceOf: Error,
    message: 'Cannot delete a non-existent response with a delay of:\n' + 10
  })
})

test.serial('invalidFileSupply', async (t) => {
  await t.throwsAsync(handler.handle(await dChannel.createMessage('!invalidfileobject')), {
    instanceOf: TypeError,
    message: 'Supplied file is not a Buffer instance:\nnot a file object'
  }, 'Invalid file object')

  return t.throwsAsync(handler.handle(await dChannel.createMessage('!invalidfile')), {
    instanceOf: TypeError,
    message: 'Supplied file is not a Buffer instance:\nnot a buffer'
  }, 'Invalid file buffer')
})

test.serial('argumentSystem', async (t) => {
  t.is((await handler.handle(await dChannel.createMessage('!argstest hello there'))).results[0].responses[0].content, 'hello+there+undefined-undefined', 'Only mandatory args')

  await t.throwsAsync(handler.handle(await dChannel.createMessage('!argstest hello')), {
    instanceOf: InputError,
    name: 'Invalid arguments:',
    message: 'Reference the help menu.',
    code: 'arguments'
  }, 'Missing arg')

  t.is((await handler.handle(await dChannel.createMessage('!argstest hello there good|sir'))).results[0].responses[0].content, 'hello+there good+sir-undefined', 'Custom delim')

  await t.throwsAsync(handler.handle(await dChannel.createMessage('!argstest')), {
    instanceOf: InputError,
    name: 'Invalid arguments:',
    message: 'Reference the help menu.',
    code: 'arguments'
  }, 'No args')

  t.is((await handler.handle(await dChannel.createMessage('!argstest hello there good|sir 5'))).results[0].responses[0].content, 'hello+there good+sir-5', 'Number arg success')

  await t.throwsAsync(handler.handle(await dChannel.createMessage('!argstest hello there good|sir string')), {
    instanceOf: InputError,
    name: 'Invalid arguments:',
    message: 'Reference the help menu.',
    code: 'arguments'
  }, 'Number arg fail')
})

test.serial('lastArgOfCommandHasDelim', (t) => {
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
    ownerId: botOwner.id,
    commands: fakeCommand
  })

  t.true(spy.calledWith('Disclaimer: Your command: lastargdelimtest\'s last argument unnecessarily has a delimiter.'))

  spy.restore()

  return fakeHandler
})

test.serial('replacerSystem', async (t) => {
  t.is((await handler.handle(await dChannel.createMessage('!echo h|r1| l |r2|'))).results[0].responses[0].content, 'hreplacer1 l replacer2', 'Replacer differenciation')

  t.is((await handler.handle(await dChannel.createMessage('!echo h|invalid| l |r2|'))).results[0].responses[0].content, 'hINVALID KEY l replacer2', 'Invalid Replacer')

  t.is((await handler.handle(await dChannel.createMessage('!echo hello |r3 1| there'))).results[0].responses[0].content, 'hello replacer3 2 there', 'Replacer with args')

  t.is((await handler.handle(await dChannel.createMessage('!echo hello |r3| there'))).results[0].responses[0].content, 'hello INVALID ARGS there', 'Incorrect args')

  const fakeHandler = new CommandHandler({
    client,
    ownerId: botOwner.id,
    commands: mockCommands,
    replacers: mockReplacers,
    options: {
      replacerBraces: {
        open: '<',
        close: '>'
      }
    }
  })

  t.is((await fakeHandler.handle(await dChannel.createMessage('!echo h<r1> l <r2>'))).results[0].responses[0].content, 'hreplacer1 l replacer2', 'Custom replacer braces')
})

test.serial('databaseRequesting', (t) => {
  return _prepareTable().then(async () => {
    const dMessage = await dChannel.createMessage('!dbtest')
    const otherMessage = await dChannel.createMessage('!dbtest')
    otherMessage.author = botOwner

    t.is((await handler.handle(dMessage)).results[0].responses[0].content, '0', 'User 0')

    return t.is((await handler.handle(otherMessage)).results[0].responses[0].content, '1', 'User 1')
  })
})

test.serial('awaitSystem', async (t) => {
  t.is((await handler.handle(await dChannel.createMessage('!awaittest'))).results[0].responses[0].content, 'first', 'Any message pt. 1')
  const awaitedResults = await handler.handle(await dChannel.createMessage('anything'))
  t.true(awaitedResults.command instanceof Await)
  t.is(awaitedResults.results[0].responses[0].content, 'second', 'Any message pt. 2')

  t.is((await handler.handle(await dChannel.createMessage('!awaittest check'))).results[0].responses[0].content, 'first', 'Wrong user pt. 1')
  const otherUserMsg = await dChannel.createMessage('!runawait check')
  otherUserMsg.author = botOwner
  t.is(await handler.handle(otherUserMsg), undefined, 'Wrong user pt. 2')

  t.is((await handler.handle(await dChannel.createMessage('!awaittest check'))).results[0].responses[0].content, 'first', 'Conditional await fail pt. 1')
  t.is(await handler.handle(await dChannel.createMessage('!runawait different')), undefined, 'Conditional await fail pt. 2')

  t.is((await handler.handle(await dChannel.createMessage('!awaittest check'))).results[0].responses[0].content, 'first', 'Conditional await success pt. 1')
  t.is((await handler.handle(await dChannel.createMessage('!runawait check'))).results[0].responses[0].content, 'second', 'Conditional await success pt. 2')

  t.is((await handler.handle(await dChannel.createMessage('!awaittest check 100'))).results[0].responses[0].content, 'first', 'Timeout await fail pt.1')
  await delay(150)
  t.is(await handler.handle(await dChannel.createMessage('!runawait check')), undefined, 'Timeout await fail pt.2')

  t.is((await handler.handle(await dChannel.createMessage('!awaittest check 2000'))).results[0].responses[0].content, 'first', 'Timeout await success pt.1')
  t.is((await handler.handle(await dChannel.createMessage('!runawait check'))).results[0].responses[0].content, 'second', 'Timeout await success pt.2')

  t.is((await handler.handle(await otherChannel.createMessage('!awaittest check 2000'))).results[0].responses[0].content, 'first', 'oneTime await fail pt.1')
  t.is(await handler.handle(await otherChannel.createMessage('!runawait different')), undefined, 'oneTime await fail pt.2')
  t.is(await handler.handle(await otherChannel.createMessage('!runawait check')), undefined, 'oneTime await fail pt.3')

  t.is((await handler.handle(await otherChannel.createMessage('!awaittest check 2000'))).results[0].responses[0].content, 'first', 'oneTime await success pt.1')
  t.is((await handler.handle(await otherChannel.createMessage('!runawait check'))).results[0].responses[0].content, 'second', 'oneTime await success pt.2')

  t.is((await handler.handle(await dChannel.createMessage('!testawaitrefresh'))).results[0].responses[0].content, 'first', 'refreshOnUse pt. 1')
  t.is((await handler.handle(await dChannel.createMessage('trigger'))).results[0].responses[0].content, 'second', 'refreshOnUse pt. 2')
  t.is((await handler.handle(await dChannel.createMessage('trigger'))).results[0].responses[0].content, 'second', 'refreshOnUse pt. 3')

  handler._awaits.delete('00')
})

test.serial('awaitTriggerResponsePassing', async (t) => {
  t.is((await handler.handle(await dChannel.createMessage('!triggerresponsetest'))).results[0].responses[0].content, 'first', 'Initial message')

  t.is((await handler.handle(await dChannel.createMessage('any'))).results[0].responses[0].content, 'any: first', 'triggerResponse passed')
})

test.serial('awaitShiftCount', async (t) => {
  t.is((await handler.handle(await dChannel.createMessage('!shiftcounttest'))).results[0].responses[0].content, 'first', 'Initial message')

  t.is((await handler.handle(await dChannel.createMessage('!trigger hello'))).results[0].responses[0].content, 'hello', 'Arguments shifted')
})

test.serial('restrictedCommands', async (t) => {
  await t.throwsAsync(handler.handle(await dChannel.createMessage('!testrestricted')), {
    instanceOf: InputError,
    name: 'This command is either temporarily disabled, or restricted.',
    message: 'Check the bot\'s announcement feed',
    code: 'restricted'
  }, 'Successful denial')

  const ownerMsg = await dChannel.createMessage('!testrestricted')
  ownerMsg.author = botOwner

  t.is((await handler.handle(ownerMsg)).results[0].responses[0].content, 'restricted message', 'Successful grant')
})

test.after.always((t) => knex.dropTable('cyclonecommandhandler').catch((ignore) => ignore))
