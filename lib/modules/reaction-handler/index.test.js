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
  Await,
  ReactCommand,
  ReactInterface
} from '../../structures/'
import {
  IgnoredError,
  InputError
} from '../../errors/'

test.beforeEach(async (t) => {
  t.context.users = {
    botOwner: new PseudoClient.User({ id: '1' }),
    otherUser: new PseudoClient.User({ id: '2' })
  }

  t.context.client = new PseudoClient(undefined, t.context.users.botOwner)

  t.context.guilds = {
    dGuild: t.context.client._joinGuild({ guildData: { id: '0' }, channels: [{ id: '0' }] })
  }

  t.context.channels = {
    dChannel: t.context.guilds.dGuild.channels.get('0'),
    otherChannel: t.context.guilds.dGuild._createChannel({ id: '1', name: 'otherChannel' }),
    restrictedChannel: t.context.guilds.dGuild._createChannel({ id: '2', name: 'restrictedChannel' }),
    nonTextChannel: t.context.guilds.dGuild._createChannel({ id: '3', name: 'nonTextChannel' })
  }
  t.context.channels.nonTextChannel.type = 2

  t.context.channels.dChannel._setPermission(t.context.users.botOwner.id, 'sendMessages', true)
  t.context.channels.otherChannel._setPermission(t.context.users.botOwner.id, 'sendMessages', true)
  t.context.channels.restrictedChannel._setPermission(t.context.client.user.id, 'sendMessages', false)
  t.context.channels.nonTextChannel._setPermission(t.context.users.botOwner.id, 'sendMessages', true)

  t.context.message = await t.context.channels.dChannel.createMessage('hello')

  t.context.initClock = () => {
    t.context.clock = sinon.useFakeTimers(Date.now())
  }
  t.context.init = (reactCommands, options) => {
    t.context.handler = new ReactionHandler({
      client: t.context.client,
      ownerID: t.context.users.botOwner.id,
      reactCommands,
      options
    })
  }
})

test.afterEach.always((t) => {
  if (t.context.clock) t.context.clock.restore()
})

const baseCommand = new ReactCommand({
  emoji: '🍕',
  desc: 'Testing react command differenciation',
  action: () => 'pizza'
})

test('invalidCommandInstance', (t) => {
  let error

  const invalidReactCommand = 1

  try {
    error = new ReactionHandler({
      client: t.context.client,
      ownerId: t.context.users.botOwner.id,
      reactCommands: invalidReactCommand
    })
  } catch (err) {
    error = err
  }

  t.deepEqual(error, TypeError('Supplied react command not a ReactCommand instance:\n1'))
})

test('reactCommandDescrimination', async (t) => {
  t.context.init([
    baseCommand,
    new ReactCommand({
      emoji: '🍧',
      desc: 'Testing react command differenciation',
      action: () => 'ice cream'
    })
  ])

  const pizza = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)

  t.truthy(pizza, 'Valid return')
  t.is(pizza.results[0].responses[0].content, 'pizza', 'Pizza react command ran')

  t.is((await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍧'), t.context.users.botOwner)).results[0].responses[0].content, 'ice cream', 'Ice cream react command ran')

  t.is(await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍟'), t.context.users.botOwner), undefined, 'Unknown react command')

  const spy = sinon.spy(t.context.message.channel, 'createMessage')

  const {
    results
  } = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)

  t.true(spy.calledWith({ content: 'pizza', embed: undefined }, undefined), 'Response sent to channel')

  t.is(results.length, 1, 'Only 1 result')

  spy.restore()
})

test('customChannel', async (t) => {
  t.context.init(new ReactCommand({
    emoji: '🍕',
    desc: 'Testing sending messages in custom channels',
    action: () => {
      return {
        content: 'content',
        options: {
          channels: t.context.channels.otherChannel.id
        }
      }
    }
  }))

  await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)

  t.truthy(t.context.channels.otherChannel.messages.find((m) => m.content === 'content'))
})

test('responseErrors', async (t) => {
  t.context.init([
    new ReactCommand({
      emoji: '🍕',
      desc: 'Test long messages',
      action: () => 'f'.repeat(2001)
    }),
    new ReactCommand({
      emoji: '🍧',
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
    new ReactCommand({
      emoji: '🍟',
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

  const longContent = await t.context.message.addReaction('🍕')
  const longEmbed = await t.context.message.addReaction('🍧')
  const invalidEmbed = await t.context.message.addReaction('🍟')
  const spy = sinon.spy(t.context.message.channel, 'createMessage')

  await t.context.handler.handle(t.context.message, longContent, t.context.users.botOwner)
  await t.context.handler.handle(t.context.message, longEmbed, t.context.users.botOwner)
  await t.throwsAsync(t.context.handler.handle(t.context.message, invalidEmbed, t.context.users.botOwner), {
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

test('uncachedMessages', async (t) => {
  t.context.init(baseCommand)

  delete t.context.message.content
  delete t.context.message.embeds

  const results = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)
  t.is(results, undefined)

  t.context.message.content = 'hello'
  t.context.message.embeds = []
})

test('restrictedReactCommands', async (t) => {
  t.context.init([
    new ReactCommand({
      emoji: '🍕',
      desc: 'Testing restricted react commands',
      options: {
        restricted: true
      },
      action: () => 'pizza'
    }),
    new ReactCommand({
      emoji: '🍧',
      desc: 'Testing designated users',
      options: {
        restricted: true,
        designatedUsers: ['1', '3']
      },
      action: () => 'ice cream'
    })
  ])

  t.context.message.author = t.context.users.botOwner

  const authorFailure = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.otherUser)
  t.is(authorFailure, undefined, 'Message author only failure')

  const authorSuccess = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)
  t.is(authorSuccess.results[0].responses[0].content, 'pizza', 'Message author only failure')

  const designatedFailure = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍧'), t.context.users.otherUser)
  t.is(designatedFailure, undefined, 'Designated users failure')

  const designatedSuccess = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍧'), t.context.users.botOwner)
  t.is(designatedSuccess.results[0].responses[0].content, 'ice cream', 'Designated users success')

  t.context.message.author = t.context.client.user
})

test('singleDataSupply', (t) => {
  t.context.init(baseCommand)

  t.truthy(t.context.handler._reactCommands.get('🍕'))
})

test('invalidReactCommandAction', async (t) => {
  t.context.init(new ReactCommand({
    emoji: '🍕',
    desc: 'A fake react command',
    action: 1
  }))

  const results = t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)

  return t.throwsAsync(results, {
    instanceOf: TypeError,
    message: 'React command action is not a function:\n🍕'
  })
})

test('multipleResponses', async (t) => {
  t.context.init(new ReactCommand({
    emoji: '🍕',
    desc: 'Testing multiple responses',
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

  await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)

  t.truthy(t.context.channels.dChannel.messages.find((m) => m.content === 'first'), 'First response')

  t.truthy(t.context.channels.otherChannel.messages.find((m) => m.content === 'second'), 'Second response')
})

test('multipleChannels', async (t) => {
  t.context.init(new ReactCommand({
    emoji: '🍕',
    desc: 'Testing multiple channels',
    action: () => {
      return {
        content: 'multiple of this',
        options: {
          channels: [t.context.channels.dChannel.id, t.context.channels.otherChannel.id]
        }
      }
    }
  }))

  await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)

  t.truthy(t.context.channels.dChannel.messages.find((m) => m.content === 'multiple of this'), 'Channel 1')

  t.truthy(t.context.channels.otherChannel.messages.find((m) => m.content === 'multiple of this'), 'Channel 2')
})

test('invalidChannel', async (t) => {
  t.context.init(new ReactCommand({
    emoji: '🍕',
    desc: 'Send a message to an invalid channel',
    action: () => {
      return {
        content: 'content',
        options: {
          channels: 'invalid'
        }
      }
    }
  }))

  return t.throwsAsync(t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner), IgnoredError, 'DiscordRESTError [50035]: Invalid Form Body\n  channel_id: Value "undefined" is not snowflake.')
})

test('noResponse', async (t) => {
  const command = new ReactCommand({
    emoji: '🍕',
    desc: 'Testing no return',
    action: () => undefined
  })

  t.context.init(command)

  t.deepEqual(await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner), {
    command,
    parentInterface: undefined,
    results: [undefined]
  })
})

test('partialReturnObject', async (t) => {
  const commands = [
    baseCommand,
    new ReactCommand({
      emoji: '🍧',
      desc: 'Just embed',
      action: () => {
        return {
          embed: {
            name: 'embed'
          }
        }
      }
    }),
    new ReactCommand({
      emoji: '🍟',
      desc: 'Just file',
      action: () => {
        return {
          file: {
            name: 'file',
            file: Buffer.from('hello')
          }
        }
      }
    }),
    new ReactCommand({
      emoji: '🌭',
      desc: 'Testing returning an empty object',
      action: () => {
        return {}
      }
    })
  ]

  t.context.init(commands)

  const {
    results: [{ responses: [contentResponse] }]
  } = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)
  t.is(contentResponse.content, 'pizza', 'Just content pt. 1')
  t.deepEqual(contentResponse.embeds, [], 'Just content pt. 2')
  t.deepEqual(contentResponse.attachments, [], 'Just content pt. 3')

  const {
    results: [{ responses: [embedResponse] }]
  } = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍧'), t.context.users.botOwner)
  t.is(embedResponse.content, undefined, 'Just embed pt. 1')
  t.deepEqual(embedResponse.embeds, [{
    name: 'embed'
  }], 'Just embed pt. 2')
  t.deepEqual(embedResponse.attachments, [], 'Just embed pt. 3')

  const {
    results: [{ responses: [fileResponse] }]
  } = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍟'), t.context.users.botOwner)
  t.is(fileResponse.content, undefined, 'Just file pt. 1')
  t.deepEqual(fileResponse.embeds, [], 'Just file pt. 2')
  t.deepEqual(fileResponse.attachments, [{
    filename: 'file',
    url: `https://cdn.discordapp.com/attachments/${t.context.guilds.dGuild.id}/${t.context.message.channel.id}/file`
  }], 'Just file pt. 3')
  t.deepEqual(fileResponse._attachmentFile, Buffer.from('hello'), 'File pt. 4')

  t.deepEqual(await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🌭'), t.context.users.botOwner), {
    command: commands.find((c) => c.emoji === '🌭'),
    parentInterface: undefined,
    results: [{
      options: {
        channels: ['0'],
        awaits: undefined
      },
      responses: [undefined]
    }]
  }, 'Empty object')
})

test('fullReturnObject', async (t) => {
  t.context.init(new ReactCommand({
    emoji: '🍕',
    desc: 'All three',
    action: () => {
      return {
        content: 'content',
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
  } = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)

  t.is(response.content, 'content', 'Content')

  t.deepEqual(response.embeds, [{
    name: 'embed'
  }], 'Embed')

  t.deepEqual(response.attachments, [{
    filename: 'file',
    url: `https://cdn.discordapp.com/attachments/${t.context.guilds.dGuild.id}/${t.context.message.channel.id}/file`
  }], 'File pt. 1')
  t.deepEqual(response._attachmentFile, Buffer.from('hello'), 'File pt. 2')
})

test('invalidFileSupply', async (t) => {
  t.context.init([
    new ReactCommand({
      emoji: '🍕',
      desc: 'Return an invalid file object',
      action: () => {
        return {
          file: 'not a file object'
        }
      }
    }),
    new ReactCommand({
      emoji: '🍧',
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

  await t.throwsAsync(t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner), {
    instanceOf: TypeError,
    message: 'Supplied file is not a Buffer instance:\nnot a file object'
  }, 'Invalid file object')

  return t.throwsAsync(t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍧'), t.context.users.botOwner), {
    instanceOf: TypeError,
    message: 'Supplied file is not a Buffer instance:\nnot a buffer'
  }, 'Invalid file buffer')
})

test('interfaceSystem', async (t) => {
  t.context.init([
    baseCommand,
    new ReactCommand({
      emoji: '🍧',
      desc: 'Testing react interfaces',
      action: () => {
        return {
          content: 'content',
          options: {
            reactInterface: new ReactInterface({
              buttons: [
                new ReactCommand({
                  emoji: '🍟',
                  action: () => 'fries'
                }),
                new ReactCommand({
                  emoji: '🍕',
                  action: () => 'new pizza'
                })
              ]
            })
          }
        }
      }
    }),
    new ReactCommand({
      emoji: '🌭',
      desc: 'Return an invalid react interface',
      action: () => {
        return {
          content: 'content',
          options: {
            reactInterface: 'string'
          }
        }
      }
    }),
    new ReactCommand({
      emoji: '🍔',
      desc: 'React interface with no response',
      action: () => {
        return {
          options: {
            reactInterface: new ReactInterface({
              buttons: new ReactCommand({
                emoji: '🍕',
                action: () => 'button'
              })
            })
          }
        }
      }
    })
  ])

  const {
    results: [{ responses: [response] }]
  } = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍧'), t.context.users.botOwner)

  t.is(response.content, 'content', 'Response content')

  t.truthy(t.context.handler._reactInterfaces.get(response.id), 'Interface bound')

  t.truthy(response.reactions['🍟'], 'Buttons added pt. 1')
  t.truthy(response.reactions['🍕'], 'Buttons added pt. 2')

  const {
    results: [{
      responses: [buttonResponse]
    }]
  } = await t.context.handler.handle(response, await response.addReaction('🍟'), t.context.users.botOwner)

  t.is(buttonResponse.content, 'fries', 'Button response')

  const {
    results: [{
      responses: [existingReactCommandButtonResponse]
    }]
  } = await t.context.handler.handle(response, await response.addReaction('🍕'), t.context.users.botOwner)

  t.is(existingReactCommandButtonResponse.content, 'new pizza', 'Button has same emoji as a react command')

  await t.context.handler.bindInterface(t.context.message, new ReactInterface({
    buttons: [
      new ReactCommand({
        emoji: ':emoji:123',
        action: () => 'button'
      }),
      new ReactCommand({
        emoji: 'a:animated:1234',
        action: () => 'animated button'
      })
    ]
  }))

  const {
    results: [{
      responses: [customEmojiResponse]
    }]
  } = await t.context.handler.handle(t.context.message, {
    name: 'emoji',
    id: '123'
  }, t.context.users.botOwner)

  t.is(customEmojiResponse.content, 'button', 'Custom emoji')

  const {
    results: [{
      responses: [animatedCustomEmojiResponse]
    }]
  } = await t.context.handler.handle(t.context.message, {
    animated: true,
    name: 'animated',
    id: '1234'
  }, t.context.users.botOwner)

  t.is(animatedCustomEmojiResponse.content, 'animated button', 'Animated custom emoji')

  await t.throwsAsync(t.context.handler.handle(t.context.message, await t.context.message.addReaction('🌭'), t.context.users.botOwner), {
    instanceOf: TypeError,
    message: 'Supplied react interface is not a ReactInterface instance:\nstring'
  }, 'Invalid react interface')

  return t.throwsAsync(t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍔'), t.context.users.botOwner), {
    instanceOf: Error,
    message: 'Cannot attach an interface to a non-existent message or response.'
  }, 'Attempted to add a react interface to non-existent response')
})

test('detachNonexistentInterface', async (t) => {
  t.context.init()

  t.is(await t.context.handler.detachInterface('123'), undefined)
})

test('maxInterfacesLessThanThree', async (t) => {
  t.context.init(undefined, {
    maxInterfaces: 2
  })

  t.is(t.context.handler._options.maxInterfaces, 3)
})

test('maxInterfacesReached', (t) => {
  t.context.init(undefined, {
    maxInterfaces: 9
  })

  const reactInterface = new ReactInterface({
    buttons: new ReactCommand({
      emoji: '🍕',
      action: () => 'button'
    })
  })

  for (let i = 0; i < 10; i++) t.context.handler._reactInterfaces.set(String(i), 1)

  return t.context.handler.bindInterface(t.context.message, reactInterface).then(() => {
    for (let i = 0; i < 3; i++) t.is(t.context.handler._reactInterfaces.get(String(i)), undefined, `Three deleted (${i})`)

    for (let i = 3; i < 10; i++) t.is(t.context.handler._reactInterfaces.get(String(i)), 1, `Six remain (${i})`)

    return t.deepEqual(t.context.handler._reactInterfaces.get(t.context.message.id), reactInterface, 'Interface registered')
  })
})

test('removeReaction', async (t) => {
  t.context.init(new ReactCommand({
    emoji: '🍕',
    desc: 'Testing removeReaction',
    options: {
      removeReaction: true
    },
    action: () => 'remove the reaction for this'
  }))

  const {
    results: [{ responses: [response] }]
  } = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)

  t.is(response.content, 'remove the reaction for this', 'Proper content')

  t.is(t.context.message.reactions['🍕'], undefined, 'Reaction removed')

  t.context.message._removeReactionError = true

  const {
    results: [{
      responses: [ignoredErrorResponse]
    }]
  } = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)

  t.is(ignoredErrorResponse.content, 'remove the reaction for this', 'Proper content before error')

  t.truthy(t.context.message.reactions['🍕'], 'Error ignored')

  t.context.message._removeReactionError = false
})

test.serial('deleteAfter', async (t) => {
  t.context.initClock()
  t.context.init([
    new ReactCommand({
      emoji: '🍕',
      desc: 'Delete response after 5 ms',
      action: () => {
        return {
          content: 'deleteafter',
          options: {
            deleteAfter: 5
          }
        }
      }
    }),
    new ReactCommand({
      emoji: '🍧',
      desc: 'Invalid deleteAfter delay',
      action: () => {
        return {
          content: 'content',
          options: {
            deleteAfter: 'string'
          }
        }
      }
    }),
    new ReactCommand({
      emoji: '🍟',
      desc: 'deleteAfter with no response',
      action: () => {
        return {
          options: {
            deleteAfter: 5
          }
        }
      }
    })
  ])

  const {
    results: [{ responses: [response] }]
  } = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)

  await response.delete()

  const uncaughtSpy = sinon.spy()
  process.on('uncaughtException', uncaughtSpy)

  const spy = sinon.spy(response, 'delete')

  t.context.clock.tick(5)

  t.true(spy.calledOnce, 'Delete called')
  t.true(uncaughtSpy.notCalled, 'Rejection caught')

  spy.restore()

  await t.throwsAsync(t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍧'), t.context.users.botOwner), {
    instanceOf: TypeError,
    message: 'Supplied deleteAfter delay is not a number:\nstring'
  }, 'deleteAfter is not a number')

  return t.throwsAsync(t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍟'), t.context.users.botOwner), {
    instanceOf: Error,
    message: 'Cannot delete a non-existent response with a delay of:\n5'
  }, 'Attempted to add a delete delay to non-existent response')
})

test('deleteAfterUse', async (t) => {
  t.context.init(new ReactCommand({
    emoji: '🍕',
    desc: 'Return a self destruct react interface',
    action: () => {
      return {
        content: 'content',
        options: {
          reactInterface: new ReactInterface({
            buttons: [
              new ReactCommand({
                emoji: '🍧',
                action: () => 'button'
              })
            ],
            options: {
              deleteAfterUse: true
            }
          })
        }
      }
    }
  }))

  const {
    results: [{ responses: [response] }]
  } = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)

  t.is(response.content, 'content', 'Proper content')

  const {
    results: [{
      responses: [buttonResponse]
    }]
  } = await t.context.handler.handle(response, await response.addReaction('🍧'), t.context.users.botOwner)

  t.is(buttonResponse.content, 'button', 'Button worked')

  t.is(t.context.handler._reactInterfaces.get(response.id), undefined, 'Interface unregistered')

  t.is(response.reactions['🍧'].count, 1, 'User (second) reaction removed')
})

test('deleteAfterUseReactionRemovalError', async (t) => {
  t.context.init(new ReactCommand({
    emoji: '🍕',
    desc: 'Return a self destruct react interface',
    action: () => {
      return {
        content: 'content',
        options: {
          reactInterface: new ReactInterface({
            buttons: [
              new ReactCommand({
                emoji: '🍧',
                action: () => 'button'
              })
            ],
            options: {
              deleteAfterUse: true
            }
          })
        }
      }
    }
  }))

  const {
    results: [{ responses: [response] }]
  } = await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)

  response._removeReactionError = true

  sinon.spy(response, 'removeReaction')

  const uncaughtSpy = sinon.spy()
  process.on('uncaughtException', uncaughtSpy)

  await t.context.handler.handle(response, await response.addReaction('🍧'), t.context.users.botOwner)

  t.true(response.removeReaction.calledOnce, 'Reaction removal called')

  t.true(uncaughtSpy.notCalled, 'Rejection caught')
})

test('awaits', async (t) => {
  t.context.init(new ReactCommand({
    emoji: '🍕',
    desc: 'Testing awaited messages',
    action: () => {
      return {
        content: 'content',
        options: {
          awaits: new Await({
            action: () => 'await content'
          })
        }
      }
    }
  }))

  const _commandHandler = new CommandHandler({
    client: t.context.client,
    ownerID: t.context.users.botOwner.id
  })

  await t.throwsAsync(t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner), {
    instanceOf: Error,
    message: 'The command handler isn\'t enabled; enable it by passing an empty array to Agent.handlerData.commands'
  }, 'No reaction handler')

  t.context.handler._agent._commandHandler = _commandHandler
  _commandHandler._agent = t.context.handler._agent

  await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'), t.context.users.botOwner)
  t.truthy(_commandHandler._awaits.get(`${t.context.message.channel.id}${t.context.users.botOwner.id}`), 'Await registered')
})

test('generateError', (t) => {
  t.context.init()

  const err = t.context.handler._generateError('name', 'message', 101)

  t.true(err instanceof Error)
  t.is(err.name, 'name')
  t.is(err.message, 'name [101]: message')
  t.is(err.code, 101)
})

test('serverOnly', async (t) => {
  t.context.init(new ReactCommand({
    emoji: '🍕',
    desc: 'Testing the serverOnly option',
    options: {
      serverOnly: true
    },
    action: () => 'content'
  }))

  t.is((await t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕'))).results[0].responses[0].content, 'content', 'Successful in server')

  t.context.channels.dChannel.type = 1

  return t.throwsAsync(t.context.handler.handle(t.context.message, await t.context.message.addReaction('🍕')), {
    name: 'This reaction command has been disabled outside of server text channels',
    message: 'Trying using it in a server channel',
    code: 'nonserver',
    instanceOf: InputError
  }, 'Throws in DM')
})
