import test from 'ava'
import sinon from 'sinon'
import {
  inspect
} from 'util'

import PseudoClient from '../../../test/pdc.js'

import {
  CommandHandler,
  ReactionHandler
} from '../'
import {
  Command,
  Replacer,
  Await,
  ReactCommand,
  ReactInterface
} from '../../structures/'
import {
  InputError,
  IgnoredError
} from '../../errors/'

const baseCommand = new Command({
  name: 'c1',
  desc: 'Test command differenciation',
  action: () => 'command1'
})
const baseReplacer = new Replacer({
  key: 'r1',
  desc: 'Test replacer differenciation',
  action: () => 'replacer1'
})

const argErrorInstance = {
  instanceOf: InputError,
  name: 'Invalid arguments',
  message: 'Reference the help menu.',
  code: 'arguments'
}

test.beforeEach((t) => {
  t.context.users = {
    botOwner: new PseudoClient.User({ id: '1', username: 'botOwner', discriminator: '4321' })
  }

  t.context.client = new PseudoClient(undefined, undefined, t.context.users.botOwner)

  t.context.guilds = {
    dGuild: t.context.client._joinGuild({ guildData: { id: '0' } })
  }

  t.context.channels = {
    dChannel: t.context.guilds.dGuild._createChannel({ id: '0', name: 'dChannel' }),
    otherChannel: t.context.guilds.dGuild._createChannel({ id: '1', name: 'otherChannel' }),
    restrictedChannel: t.context.guilds.dGuild._createChannel({ id: '2', name: 'restrictedChannel' }),
    nonTextChannel: t.context.guilds.dGuild._createChannel({ id: '3', name: 'nonTextChannel' })
  }
  t.context.channels.nonTextChannel.type = 2

  t.context.channels.dChannel._setPermission(t.context.users.botOwner.id, 'sendMessages', true)
  t.context.channels.otherChannel._setPermission(t.context.users.botOwner.id, 'sendMessages', true)
  t.context.channels.restrictedChannel._setPermission(t.context.client.user.id, 'sendMessages', false)
  t.context.channels.nonTextChannel._setPermission(t.context.users.botOwner.id, 'sendMessages', true)

  t.context.initClock = () => {
    t.context.clock = sinon.useFakeTimers(Date.now())
  }

  t.context.init = (commands, replacers, options) => {
    t.context.handler = new CommandHandler({
      client: t.context.client,
      ownerID: t.context.users.botOwner.id,
      commands,
      replacers,
      options
    })
  }
})

test.afterEach.always((t) => {
  if (t.context.clock) t.context.clock.restore()
})

test('invalidCommandInstance', (t) => {
  let error

  try {
    error = new CommandHandler({
      client: t.context.client,
      ownerId: t.context.users.botOwner.id,
      commands: 1
    })
  } catch (err) {
    error = err
  }

  t.deepEqual(error, TypeError('Supplied command not a Command instance:\n1'))
})

test('invalidReplacerInstance', (t) => {
  let error

  try {
    error = new CommandHandler({
      client: t.context.client,
      ownerId: t.context.users.botOwner.id,
      replacers: 1
    })
  } catch (err) {
    error = err
  }

  t.deepEqual(error, TypeError('Supplied replacer not Replacer instance:\n' + undefined))
})

test('invalidAwaitInstance', async (t) => {
  t.context.init(new Command({
    name: 'invalidawait',
    desc: 'A command that returns an invalid Await instance',
    action: () => {
      return {
        content: 'invalidawaitcontent',
        options: {
          awaits: 'invalid'
        }
      }
    }
  }))

  return t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!invalidawait')), {
    instanceOf: TypeError,
    message: 'Supplied await is not an Await instance:\ninvalid'
  })
})

test('openingReplacerBraceIncludesPrefix', (t) => {
  const spy = sinon.spy(console, 'log')

  t.context.init(undefined, undefined, {
    prefix: '!',
    replacerBraces: {
      open: '!['
    }
  })

  t.false(spy.calledWith('WARNING: Your replacer opening brace starts with your prefix. This could lead to some issues.'), 'Without replacers')

  t.context.init(undefined, baseReplacer, {
    prefix: '!',
    replacerBraces: {
      open: '!['
    }
  })

  t.true(spy.calledWith('WARNING: Your replacer opening brace starts with your prefix. This could lead to some issues.'), 'With replacers')

  spy.restore()
})

test('singleDataSupply', (t) => {
  t.context.init(baseCommand, baseReplacer)

  t.truthy(t.context.handler._commands.get('c1'), 'Command')
  t.truthy(t.context.handler._replacers.get('r1'), 'Replacer')
})

test('invalidCommandAction', async (t) => {
  t.context.init(new Command({
    name: 'invalidaction',
    desc: 'A command with an invalid action',
    action: 'invalid'
  }))

  return t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!invalidaction')), {
    instanceOf: TypeError,
    message: 'Command action is not a function:\ninvalidaction'
  })
})

test('invalidAwaitAction', async (t) => {
  t.context.init(new Command({
    name: 'invalidawaitaction',
    desc: 'A command that returns an await with an invalid action',
    action: () => {
      return {
        options: {
          awaits: new Await({
            action: 'invalid'
          })
        }
      }
    }
  }))

  await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!invalidawaitaction'))

  await t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('anything')), {
    instanceOf: TypeError,
    message: 'Command action is not a function:\nawaitID: 00'
  })
})

test('prefixDetermination', async (t) => {
  t.context.init(baseCommand)

  t.is(await t.context.handler.handle(await t.context.channels.dChannel.createMessage('c1')), undefined, 'No prefix failed')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!c1'))).results[0].responses[0].content, 'command1', 'Command 1 ran')

  t.context.init(baseCommand, undefined, {
    prefix: '<>'
  })

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('<>c1'))).results[0].responses[0].content, 'command1', 'Custom prefix')
})

test('mentionPrefix', async (t) => {
  t.context.init(baseCommand)

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage(`<@${t.context.client.user.id}>c1`))).results[0].responses[0].content, 'command1', 'No space')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage(`<@${t.context.client.user.id}> c1`))).results[0].responses[0].content, 'command1', 'With space')
})

test('commandDiscrimination', async (t) => {
  t.context.init([
    baseCommand,
    new Command({
      name: 'c2',
      desc: 'Test command differenciation',
      action: () => 'command2'
    })
  ])

  const command1 = await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!c1'))

  t.truthy(command1, 'Valid return')
  t.is(command1.results[0].responses[0].content, 'command1', 'Command 1 ran')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!c2'))).results[0].responses[0].content, 'command2', 'Command 2 ran')

  const spyMessage = await t.context.channels.dChannel.createMessage('!c1')
  const spy = sinon.spy(spyMessage.channel, 'createMessage')

  const {
    results
  } = await t.context.handler.handle(spyMessage)

  t.true(spy.calledWith({ content: 'command1', embed: undefined }, undefined), 'Response sent to channel')

  t.is(results.length, 1, 'Only 1 result')

  spy.restore()
})

test('aliases', async (t) => {
  t.context.init(new Command({
    name: 'aliastest',
    desc: 'Testing command aliases',
    options: {
      aliases: ['alias']
    },
    action: () => 'aliascontent'
  }))

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!aliastest'))).results[0].responses[0].content, 'aliascontent', 'Base name ran')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!alias'))).results[0].responses[0].content, 'aliascontent', 'Alias ran')
})

test('customChannel', async (t) => {
  t.context.init(new Command({
    name: 'customchannel',
    desc: 'Testing a command that sends its response to a custom channel',
    action: () => {
      return {
        content: 'customchannelcontent',
        options: {
          channels: t.context.channels.otherChannel.id
        }
      }
    }
  }))

  await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!customchannel'))

  t.truthy(t.context.channels.otherChannel.messages.find((m) => m.content === 'customchannelcontent'))
})

test('multipleResponses', async (t) => {
  t.context.init(new Command({
    name: 'multipleresponses',
    desc: 'Testing a command that sends multiple responses',
    action: () => {
      return [{
        content: 'first'
      }, {
        content: 'second',
        options: {
          channels: t.context.channels.otherChannel.id
        }
      }]
    }
  }))

  await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!multipleresponses'))

  t.truthy(t.context.channels.dChannel.messages.find((m) => m.content === 'first'), 'First response')

  t.truthy(t.context.channels.otherChannel.messages.find((m) => m.content === 'second'), 'Second response')
})

test('multipleChannels', async (t) => {
  t.context.init(new Command({
    name: 'multiplechannels',
    desc: 'Testing a command that sends multiple messages to different channels',
    action: () => {
      return {
        content: 'multiple of this',
        options: {
          channels: [t.context.channels.dChannel.id, t.context.channels.otherChannel.id]
        }
      }
    }
  }))

  await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!multiplechannels'))

  t.truthy(t.context.channels.dChannel.messages.find((m) => m.content === 'multiple of this'), 'Channel 1')

  t.truthy(t.context.channels.otherChannel.messages.find((m) => m.content === 'multiple of this'), 'Channel 2')
})

test('responseErrors', async (t) => {
  t.context.init([
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
    })
  ])

  const longContent = await t.context.channels.dChannel.createMessage('!longmessagetest')
  const longEmbed = await t.context.channels.dChannel.createMessage('!longembedtest')
  const invalidEmbed = await t.context.channels.dChannel.createMessage('!invalidembed')
  const spy = sinon.spy(t.context.channels.dChannel, 'createMessage')

  await t.context.handler.handle(longContent)
  await t.context.handler.handle(longEmbed)
  await t.throwsAsync(t.context.handler.handle(invalidEmbed), {
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

test('emptyAction', async (t) => {
  const command = new Command({
    name: 'emptyaction',
    desc: 'A command with no return in the action',
    action: () => undefined
  })

  t.context.init(command)

  t.deepEqual(await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!emptyaction')), {
    command,
    results: [undefined]
  })
})

test('partialReturnObject', async (t) => {
  t.context.init([
    baseCommand,
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
      name: 'emptyobject',
      desc: 'A command that returns an empty object',
      action: () => {
        return {}
      }
    }),
    new Command({
      name: 'justawait',
      desc: 'Return just an await',
      action: () => {
        return {
          options: {
            awaits: new Await({
              action: () => 'awaited'
            })
          }
        }
      }
    })
  ])

  const {
    results: [{ responses: [contentResponse] }]
  } = await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!c1'))
  t.is(contentResponse.content, 'command1', 'Just content pt. 1')
  t.is(contentResponse.embeds.length, 0, 'Just content pt. 2')
  t.is(contentResponse.attachments.length, 0, 'Just content pt. 3')

  const {
    results: [{ responses: [embedResponse] }]
  } = await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!justembed'))
  t.is(embedResponse.content, undefined, 'Just embed pt. 1')
  t.deepEqual(embedResponse.embeds, [{ name: 'embed', fields: [{ name: 'field', value: 'value' }] }], 'Just embed pt. 2')
  t.is(embedResponse.attachments.length, 0, 'Just embed pt. 3')

  const {
    results: [{ responses: [fileResponse] }]
  } = await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!justfile'))
  t.is(fileResponse.content, undefined, 'Just file pt. 1')
  t.is(fileResponse.embeds.length, 0, 'Just file pt. 2')
  t.deepEqual(fileResponse.attachments, [{ filename: 'file', url: `https://cdn.discordapp.com/attachments/${t.context.guilds.dGuild.id}/${t.context.channels.dChannel.id}/file` }], 'Just file pt. 3a')
  t.deepEqual(fileResponse._attachmentFile, Buffer.from('file'), 'Just file pt. 3b')

  const {
    results: emptyResults
  } = await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!emptyobject'))

  t.deepEqual(emptyResults, [{
    options: {
      channels: ['0'],
      awaits: undefined
    },
    responses: [undefined]
  }], 'Empty object')

  const {
    results: waitResults
  } = await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!justawait'))

  t.true(waitResults[0].options.awaits[0] instanceof Await, 'Just await')
})

test('fullReturnObject', async (t) => {
  t.context.init(new Command({
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
  }))

  const {
    results: [{ responses: [response] }]
  } = await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!testallthree'))

  t.is(response.content, 'allthreecontent', 'Content')

  t.deepEqual(response.embeds, [{
    name: 'embed'
  }], 'Embed')

  t.deepEqual(response.attachments, [{
    filename: 'file',
    url: `https://cdn.discordapp.com/attachments/${t.context.guilds.dGuild.id}/${t.context.channels.dChannel.id}/file`
  }], 'File')
})

test('invalidChannel', async (t) => {
  t.context.init(new Command({
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
  }))

  t.context.handler._agent = {
    validateChannel: () => false
  }

  return t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!invalidchannel')), {
    instanceOf: IgnoredError,
    name: 'Invalid Channel',
    message: 'The provided channel was not valid to send a message to',
    code: 400
  })
})

test.serial('deleteAfter', async (t) => {
  t.context.initClock()
  t.context.init([
    new Command({
      name: 'deleteafter',
      desc: 'Test deleteAfter',
      action: () => {
        return {
          content: 'deleteafter',
          options: {
            deleteAfter: 5
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
    })
  ])

  const {
    results: [{ responses: [message] }]
  } = await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!deleteafter'))

  await message.delete()

  const uncaughtSpy = sinon.spy()
  process.on('uncaughtException', uncaughtSpy)

  const spy = sinon.spy(message, 'delete')

  t.context.clock.tick(5)

  t.true(spy.calledOnce, 'Delete called')
  t.true(uncaughtSpy.notCalled, 'Rejection caught')

  spy.restore()

  return t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!invaliddeleteafter')), 'Supplied deleteAfter delay is not a number:\nstring', 'Not a number throws')
})

test('reactInterfaces', async (t) => {
  const reactInterface = new ReactInterface({
    buttons: [
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
  })

  t.context.init(new Command({
    name: 'reactinterface',
    desc: 'Testing react interfaces',
    action: () => {
      return {
        content: 'interface',
        options: {
          reactInterface
        }
      }
    }
  }))

  const reactionHandler = new ReactionHandler({
    client: t.context.client,
    ownerID: t.context.users.botOwner.id
  })

  await t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!reactinterface')), 'The reaction handler isn\'t enabled; enable it by passing an empty array to Agent.handlerData.reactCommands', 'No reaction handler')

  t.context.handler._agent = {
    reactionHandler,
    validateChannel: () => true
  }
  reactionHandler._agent = t.context.handler._agent

  const {
    results: [{
      responses: [interfaceMsg]
    }]
  } = await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!reactinterface'))

  t.deepEqual(t.context.handler._agent.reactionHandler._reactInterfaces.get(interfaceMsg.id), reactInterface, 'Interface stored in reaction handler')
  t.truthy(interfaceMsg.reactions['🍕'], 'Message has pizza button')
  t.truthy(interfaceMsg.reactions['🍨'], 'Message has ice cream button')
})

test('failOnMsgSpecificOptionsWithNoMessage', async (t) => {
  t.context.init(new Command({
    name: 'justdeleteafter',
    desc: 'A command that only passes the deleteAfter option',
    action: () => {
      return {
        options: {
          deleteAfter: 10
        }
      }
    }
  }))

  return t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!justdeleteafter')), 'Cannot delete a non-existent response with a delay of:\n' + 10)
})

test('invalidFileSupply', async (t) => {
  t.context.init([
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
    })
  ])

  await t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!invalidfileobject')), {
    instanceOf: TypeError,
    message: 'Supplied file is not a Buffer instance:\nnot a file object'
  }, 'Invalid file object')

  return t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!invalidfile')), {
    instanceOf: TypeError,
    message: 'Supplied file is not a Buffer instance:\nnot a buffer'
  }, 'Invalid file buffer')
})

test('argumentSystem', async (t) => {
  t.context.init(new Command({
    name: 'argstest',
    desc: 'Testing args',
    options: {
      args: [{ name: 'mandatoryArg', mand: true }, { name: 'customDelimArg', delim: '|', mand: true }, { name: 'optionalArg' }, { name: 'numberArg', type: 'number' }]
    },
    action: ({ args: [mandatoryArg, customDelimArg, optionalArg, numberArg] }) => `${mandatoryArg}+${customDelimArg}+${optionalArg}-${numberArg}`
  }))

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!argstest hello there'))).results[0].responses[0].content, 'hello+there+undefined-undefined', 'Only mandatory args')

  await t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!argstest hello')), argErrorInstance, 'Missing arg')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!argstest hello there good|sir'))).results[0].responses[0].content, 'hello+there good+sir-undefined', 'Custom delim')

  await t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!argstest')), argErrorInstance, 'No args')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!argstest hello there good|sir 5'))).results[0].responses[0].content, 'hello+there good+sir-5', 'Number arg success')

  await t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!argstest hello there good|sir string')), argErrorInstance, 'Number arg fail')

  await t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!argstest hello ')), argErrorInstance, 'Dangling delim')
})

test('dynamicArguments', async (t) => {
  t.context.init([
    new Command({
      name: 'usertag',
      desc: 'Get a user discrim',
      options: {
        args: [{ name: 'user', type: 'user' }]
      },
      action: ({ args: [user] }) => user.discriminator
    }),
    new Command({
      name: 'channelname',
      desc: 'Get a channel\'s name',
      options: {
        args: [{ name: 'channel', type: 'channel' }]
      },
      action: ({ args: [channel] }) => channel.name
    })
  ])

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage(`!usertag <@${t.context.users.botOwner.id}>`))).results[0].responses[0].content, '4321', 'User mention')
  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!usertag botowner'))).results[0].responses[0].content, '4321', 'User name')
  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!usertag owne'))).results[0].responses[0].content, '4321', 'Partial user name')
  await t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!usertag invalid')), argErrorInstance, 'Invalid user')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage(`!channelname <#${t.context.channels.dChannel.id}>`))).results[0].responses[0].content, 'dChannel', 'Channel mention')
  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!channelname dchannel'))).results[0].responses[0].content, 'dChannel', 'Channel name')
  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!channelname dchan'))).results[0].responses[0].content, 'dChannel', 'Partial channel name')
  await t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!channelname invalid')), argErrorInstance, 'Invalid channel')
})

test('multiCharacterDelim', async (t) => {
  t.context.init(new Command({
    name: 'longdelim',
    desc: 'Testing when a delimiter is longer than 1 character',
    options: {
      args: [{ name: 'first' }, { name: 'multichar', delim: '||' }, { name: 'last' }]
    },
    action: ({ args: [first, multi, last] }) => `${first} ${multi} ${last}`
  }))

  return t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!longdelim first multi||third'))).results[0].responses[0].content, 'first multi third')
})

test('lastArgOfCommandHasDelim', (t) => {
  const spy = sinon.spy(console, 'log')

  t.context.init(new Command({
    name: 'lastargdelimtest',
    desc: 'Testing when the last arg has a delim',
    options: {
      args: [{ name: 'arg', delim: '|' }]
    },
    action: () => ''
  }))

  t.true(spy.calledWith('DISCLAIMER: Command lastargdelimtest\'s last argument unnecessarily has a delimiter.'))

  spy.restore()
})

test('invalidArgMandation', (t) => {
  const spy = sinon.spy(console, 'error')

  t.context.init(baseCommand)

  t.false(spy.called)

  t.context.init(new Command({
    name: 'invalidmandtest',
    desc: 'Testing when the arg mandations are invalid',
    options: {
      args: [{ name: 'opt' }, { name: 'mand', mand: true }]
    },
    action: () => ''
  }))

  t.true(spy.calledWith('WARNING: Command invalidmandtest has invalid argument mandates.\nMake sure all arguments leading up to the last mandatory argument are mandatory as well.'))

  spy.restore()
})

test('replacerSystem', async (t) => {
  const command = new Command({
    name: 'echo',
    desc: 'Echo what was said',
    options: {
      args: [{ name: 'content', mand: true }]
    },
    action: ({ args: [content] }) => content
  })

  const replacers = [
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

  t.context.init(command, replacers)

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!echo h|r1| l |r2|'))).results[0].responses[0].content, 'hreplacer1 l replacer2', 'Replacer differenciation')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!echo h|invalid| l |r2|'))).results[0].responses[0].content, 'hINVALID KEY l replacer2', 'Invalid Replacer')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!echo hello |r3 1| there'))).results[0].responses[0].content, 'hello replacer3 2 there', 'Replacer with args')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!echo hello |r3| there'))).results[0].responses[0].content, 'hello INVALID ARGS there', 'Incorrect args')

  t.context.init(command, replacers, {
    replacerBraces: {
      open: '<',
      close: '>'
    }
  })

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!echo h<r1> l <r2>'))).results[0].responses[0].content, 'hreplacer1 l replacer2', 'Custom replacer braces')
})

test('dynamicArgReplacers', async (t) => {
  const command = new Command({
    name: 'echo',
    desc: 'Echo what was said',
    options: {
      args: [{ name: 'content', mand: true }]
    },
    action: ({ args: [content] }) => content
  })

  const replacer = new Replacer({
    key: 'r1',
    desc: 'A replacer with dynamic arguments',
    options: {
      args: [{ name: 'user', type: 'user' }, { name: 'channel', type: 'channel' }]
    },
    action: ({ args: [user, channel] }) => user.discriminator + ' ' + channel.name
  })

  t.context.init(command, replacer)

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!echo |r1 botowner dchannel|'))).results[0].responses[0].content, '4321 dChannel')
})

test.serial('awaitSystem', async (t) => {
  t.context.initClock()
  t.context.init([
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
            awaits: new Await({
              options: {
                check: check ? (msg) => msg.content.startsWith('!runawait') && msg.content.split(' ')[1] === check : undefined,
                timeout: timeout ? parseInt(timeout) : undefined,
                oneTime: msg.channel.id === t.context.channels.otherChannel.id
              },
              action: () => 'second'
            })
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
            awaits: new Await({
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
      name: 'testmultipleawaits',
      desc: 'Test awaiting in multiple channels',
      action: () => {
        return {
          content: 'first',
          options: {
            awaits: [
              new Await({
                options: {
                  oneTime: true
                },
                action: () => 'second'
              }),
              new Await({
                options: {
                  channel: t.context.channels.otherChannel.id,
                  oneTime: true
                },
                action: () => 'second'
              })
            ]
          }
        }
      }
    })
  ])

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!awaittest'))).results[0].responses[0].content, 'first', 'Any message pt. 1')
  const awaitedResults = await t.context.handler.handle(await t.context.channels.dChannel.createMessage('anything'))
  t.true(awaitedResults.command instanceof Await)
  t.is(awaitedResults.results[0].responses[0].content, 'second', 'Any message pt. 2')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!awaittest check'))).results[0].responses[0].content, 'first', 'Wrong user pt. 1')
  const otherUserMsg = await t.context.channels.dChannel.createMessage('!runawait check')
  otherUserMsg.author = t.context.users.botOwner
  t.is(await t.context.handler.handle(otherUserMsg), undefined, 'Wrong user pt. 2')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!awaittest check'))).results[0].responses[0].content, 'first', 'Conditional await fail pt. 1')
  t.is(await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!runawait different')), undefined, 'Conditional await fail pt. 2')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!awaittest check'))).results[0].responses[0].content, 'first', 'Conditional await success pt. 1')
  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!runawait check'))).results[0].responses[0].content, 'second', 'Conditional await success pt. 2')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!awaittest check 5'))).results[0].responses[0].content, 'first', 'Timeout await fail pt. 1')
  t.context.clock.tick(5)
  t.is(await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!runawait check')), undefined, 'Timeout await fail pt. 2')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!awaittest check 2000'))).results[0].responses[0].content, 'first', 'Timeout await success pt. 1')
  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!runawait check'))).results[0].responses[0].content, 'second', 'Timeout await success pt. 2')

  t.is((await t.context.handler.handle(await t.context.channels.otherChannel.createMessage('!awaittest check 2000'))).results[0].responses[0].content, 'first', 'oneTime await fail pt. 1')
  t.is(await t.context.handler.handle(await t.context.channels.otherChannel.createMessage('!runawait different')), undefined, 'oneTime await fail pt. 2')
  t.is(await t.context.handler.handle(await t.context.channels.otherChannel.createMessage('!runawait check')), undefined, 'oneTime await fail pt. 3')

  t.is((await t.context.handler.handle(await t.context.channels.otherChannel.createMessage('!awaittest check 2000'))).results[0].responses[0].content, 'first', 'oneTime await success pt. 1')
  t.is((await t.context.handler.handle(await t.context.channels.otherChannel.createMessage('!runawait check'))).results[0].responses[0].content, 'second', 'oneTime await success pt. 2')
  t.is((await t.context.handler.handle(await t.context.channels.otherChannel.createMessage('!runawait check'))), undefined, 'oneTime await success pt. 3')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!testawaitrefresh'))).results[0].responses[0].content, 'first', 'refreshOnUse pt. 1')
  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('trigger'))).results[0].responses[0].content, 'second', 'refreshOnUse pt. 2')
  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('trigger'))).results[0].responses[0].content, 'second', 'refreshOnUse pt. 3')
  t.context.handler._awaits.get('00').clear()

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!testmultipleawaits'))).results[0].responses[0].content, 'first', 'multiple awaits pt. 1')
  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('trigger'))).results[0].responses[0].content, 'second', 'multiple awaits pt. 2')
  t.is((await t.context.handler.handle(await t.context.channels.otherChannel.createMessage('trigger'))).results[0].responses[0].content, 'second', 'multiple awaits pt. 3')
})

test('awaitNoArrayDirectly', (t) => {
  t.context.init()

  t.context.handler.addAwaits(new Await({
    options: {
      user: t.context.client.user.id,
      channel: t.context.channels.dChannel.id
    },
    action: () => 'response'
  }))

  const wait = t.context.handler._awaits.get('00')

  t.is(wait.action(), 'response')
  wait.clear()
})

test('providedAwaitUser', async (t) => {
  t.context.init(new Command({
    name: 'awaitusertest',
    desc: 'Test awaiting a specific user',
    action: () => {
      return {
        content: 'initial',
        options: {
          awaits: new Await({
            options: {
              user: t.context.users.botOwner.id,
              oneTime: true
            },
            action: () => 'triggered'
          })
        }
      }
    }
  }))

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!awaitusertest'))).results[0].responses[0].content, 'initial', 'Initial message')

  t.is(await t.context.handler.handle(await t.context.channels.dChannel.createMessage('trigger')), undefined, 'Wrong user did not trigger')

  const correctUserMsg = await t.context.channels.dChannel.createMessage('trigger')
  correctUserMsg.author = t.context.users.botOwner

  t.is((await t.context.handler.handle(correctUserMsg)).results[0].responses[0].content, 'triggered', 'Initial message')
})

test('awaitRequirePrefix', async (t) => {
  t.context.init(new Command({
    name: 'requireprefixtest',
    desc: 'Testing requirePrefix for awaits',
    action: () => {
      return {
        content: 'initial',
        options: {
          awaits: new Await({
            options: {
              check: (msg, content) => content.startsWith('trigger'),
              requirePrefix: true
            },
            action: () => 'success'
          })
        }
      }
    }
  }))

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!requireprefixtest'))).results[0].responses[0].content, 'initial', 'Initial message')

  t.is(await t.context.handler.handle(await t.context.channels.dChannel.createMessage('trigger')), undefined, 'No prefix failure')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!trigger'))).results[0].responses[0].content, 'success', 'Prefix success')
})

test('awaitTriggerResponsePassing', async (t) => {
  t.context.init(new Command({
    name: 'triggerresponsetest',
    desc: 'Test triggerResponse passing for awaits',
    action: () => {
      return {
        content: 'first',
        options: {
          awaits: new Await({
            action: ({ msg, triggerResponse }) => `${msg.content}: ${triggerResponse.content}`
          })
        }
      }
    }
  }))

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!triggerresponsetest'))).results[0].responses[0].content, 'first', 'Initial message')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('any'))).results[0].responses[0].content, 'any: first', 'triggerResponse passed')
})

test('awaitShift', async (t) => {
  t.context.init([
    new Command({
      name: 'shifttest',
      desc: 'Testing shouldShift for awaits',
      action: () => {
        return {
          content: 'first',
          options: {
            awaits: new Await({
              options: {
                args: [{ name: 'arg', mand: true }, { name: 'opt' }],
                check: (msg, content) => content.startsWith('trigger'),
                shouldShift: true,
                requirePrefix: true
              },
              action: ({ args: [arg] }) => arg
            })
          }
        }
      }
    }),
    new Command({
      name: 'noshifttest',
      desc: 'Testing arguments with no shift',
      action: () => {
        return {
          content: 'first',
          options: {
            awaits: new Await({
              options: {
                args: [{ name: 'arg', mand: true }],
                check: (msg, content) => content.startsWith('trigger'),
                requirePrefix: true
              },
              action: ({ args: [arg] }) => arg
            })
          }
        }
      }
    })
  ])

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!shifttest'))).results[0].responses[0].content, 'first', 'Shift: Initial message')
  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!trigger hello'))).results[0].responses[0].content, 'hello', 'Shift: Arguments shifted')

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!noshifttest'))).results[0].responses[0].content, 'first', 'No Shift: Initial message')
  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!trigger hello'))).results[0].responses[0].content, 'trigger hello', 'No Shift: Trigger included')
})

test('awaitNoFallbackErrors', (t) => {
  t.context.init()

  t.throws(() => t.context.handler.addAwaits(new Await({
    options: {
      user: t.context.client.user.id
    },
    action: () => 'hello'
  })), 'An await didn\'t have a defined channel or fallback channel. This can be caused by directly calling CommandHandler.addAwaits', 'No channel')

  t.throws(() => t.context.handler.addAwaits(new Await({
    options: {
      channel: t.context.channels.dChannel.id
    },
    action: () => 'hello'
  })), 'An await didn\'t have a defined user or fallback user. This can be caused by directly calling CommandHandler.addAwaits', 'No user')
})

test('restrictedCommands', async (t) => {
  t.context.init(new Command({
    name: 'testrestricted',
    desc: 'A restricted command',
    options: {
      restricted: true
    },
    action: () => 'restricted message'
  }))

  await t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!testrestricted')), {
    instanceOf: InputError,
    name: 'This command is either temporarily disabled, or restricted',
    message: 'Check the bot\'s announcement feed',
    code: 'restricted'
  }, 'Successful denial')

  const ownerMsg = await t.context.channels.dChannel.createMessage('!testrestricted')
  ownerMsg.author = t.context.users.botOwner

  t.is((await t.context.handler.handle(ownerMsg)).results[0].responses[0].content, 'restricted message', 'Successful grant')
})

test('noPrefixForDM', async (t) => {
  t.context.init(baseCommand)

  const channel = await t.context.client.getDMChannel(t.context.users.botOwner.id)

  t.is((await t.context.handler.handle(await channel.createMessage('c1'))).results[0].responses[0].content, 'command1')
})

test('guildOnly', async (t) => {
  t.context.init(new Command({
    name: 'guildonlytest',
    desc: 'Testing the guildOnly option',
    options: {
      guildOnly: true
    },
    action: () => 'content'
  }))

  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!guildonlytest'))).results[0].responses[0].content, 'content', 'Successful in guild')

  t.context.channels.dChannel.type = 1

  return t.throwsAsync(t.context.handler.handle(await t.context.channels.dChannel.createMessage('!guildonlytest')), {
    instanceOf: InputError,
    name: 'This command has been disabled outside of guild text channels',
    message: 'Trying using it in a guild channel',
    code: 'nonguild'
  }, 'Throws in DM')
})

test('guildPrefixes', async (t) => {
  t.context.init(baseCommand)

  t.is(await t.context.handler.handle(await t.context.channels.dChannel.createMessage('-c1')), undefined, 'Invalid prefix')

  t.context.init(baseCommand, undefined, {
    guildPrefixes: { [t.context.guilds.dGuild.id]: '>', '2': '-' }
  })

  t.is(await t.context.handler.handle(await t.context.channels.dChannel.createMessage('-c1')), undefined, 'Wrong guild prefix')
  t.is(await t.context.handler.handle(await t.context.channels.dChannel.createMessage('!c1')), undefined, 'Default prefix fails')
  t.is((await t.context.handler.handle(await t.context.channels.dChannel.createMessage('>c1'))).results[0].responses[0].content, 'command1', 'Successful custom prefix')
})

test('DMChannel', async (t) => {
  t.context.init(baseCommand)

  const channel = await t.context.client.getDMChannel(t.context.users.botOwner.id)

  await t.context.handler.handle(await channel.createMessage('c1'))

  t.truthy(channel.messages.find((m) => m.content === 'command1'))
})
