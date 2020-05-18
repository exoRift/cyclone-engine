<img src="assets/Splash.png" alt="Splash Banner" width="500"/>

![Build Verification](https://github.com/mets11rap/cyclone-engine/workflows/Build%20Verification/badge.svg?branch=master&event=push)
[![codecov](https://codecov.io/gh/mets11rap/cyclone-engine/branch/master/graph/badge.svg)](https://codecov.io/gh/mets11rap/cyclone-engine)
[![Discord Server](https://img.shields.io/badge/-Support%20Server-b.svg?colorA=697ec4&colorB=7289da&logo=discord)](https://discord.gg/Rqd8SJ9)
[![Version](https://img.shields.io/github/package-json/v/mets11rap/cyclone-engine.svg?label=Version)](#)
[![Node Version](https://img.shields.io/node/v/cyclone-engine?label=Node%20Version&logo=node.js)](#)
[![NPM Downloads](https://img.shields.io/npm/dt/cyclone-engine?label=Downloads&logo=npm)](#)

[![NPM Page](https://img.shields.io/badge/NPM-Page-critical?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/cyclone-engine)

An advanced bot engine for Discord running on lightweight Eris
-
**What can Cyclone do?**

- Manage and automate connections to the Discord API

- Handle commands with capability, versatility, and ease

- Add user flexibility to your bot with command aliases

- Prevent crashing due to errors

- Integrate automated actions

- Simplify how attachments such as databases are integrated into systems

- Auto generate command info

- Utilize a dynamic built-in help menu generator

- Return command results for analysis and logging

- Create interactive menus with awaited actions and reactions

- Grant complete freedom of bot design

- Assign authority levels to server roles with an ALO permissions system

# Examples of bots that use Cyclone
- <font size='+1'>[**GuildLink**](https://github.com/mets11rap/guildlink)</font>

# Getting started
>Prerequisites

`eris` - You need to install Eris and supply it to the agent. Eris is supplied manually to allow custom Eris classes to be used by the engine.

<a href='https://mets11rap.github.io/cyclone-engine/' style='color: #4747d1'><font size='+2'>**Documentation**</font></a>

```
npm i cyclone-engine
```
***
>Constructing the Agent class

The Agent class is the main manager of the bot. This will be controlling automated actions as well as call the Command & Reaction Handler.
```js
const {
  TOKEN
} = process.env

const Eris = require('eris')
const {
  Agent 
} = require('cyclone-engine')

const handlerData = require('./data/')

function postFunction (msg, results) {
  if (results) console.log(`${msg.timestamp} - **${msg.author.username}** > *${results.command.name}*`)
}

const agent = new Agent({
  Eris,
  token: TOKEN,
  handlerData,
  options: {
    connectRetryLimit: 5,
    prefix: '.',
    loopFunction: {
      func: (agent) => {
        agent._client.getDMChannel(agent._CommandHandler.ownerId).then((channel) =>
          channel.createMessage('Current server count is: ' + agent._client.guilds.size)
        )
      }, /* DM the number of guilds the bot is in to the owner */
      interval: 1800000, /* 30 minutes */
    },
    postMessageFunction: postFunction,
    postReactionFunction: postFunction
  }
})

agent.connect()
```
{docs.class.Agent}
***
>Using an attachment such as a database manager

If you'd like to have a class/object/value that can be utilized by commands even if it's not defined in the same scope, you can use the attachment feature

**Knex example:**
--
Main file:
```js
const {
  TOKEN,
  DATABASE_URL
} = process.env

const Eris = require('eris')
const Knex = require('knex')

const {
  commands
} = require('./data/')

const knex = new Knex({
  client: 'pg',
  connection: DATABASE_URL
})

const agent = new Agent({
  Eris,
  token: TOKEN,
  handlerData: {
    commands
  }
})

agent.addAttachment('db', knex)

agent.connect()
```
Command file:
```js
const {
  Command
} = require('cyclone-engine')

const data = {
  name: 'points',
  desc: 'See how many points you have',
  action: ({ agent, msg }) => {
    return agent.attachments.db('users')
      .select('points')
      .where({
        id: msg.author.id
      })
      .limit(1)
      .then((res) => {
        if (res) return res.points
        else return 'You aren\'t registered in the database'
      })
  }
}

module.exports = new Command(data)
```
***
>Constructing the Command Handler without the agent

The Command Handler is taken care of automatically when the agent is constructed and connected. However, if you would not like to use the agent, you can construct the handler separately.
```js
const {
  TOKEN
} = process.env

const Eris = require('eris')
const client = new Eris(TOKEN)

const {
  CommandHandler
} = require('cyclone-engine')

const {
  commands,
  replacers
} = require('./data/')

const handler = client.getOAuthApplication().then((app) => {
  client.connect()

  return new CommandHandler({
    client,
    ownerID: app.owner.id,
    commands,
    replacers
  })
})

client.on('messageCreate', (msg) => handler.handle(msg))
```
{docs.class.CommandHandler}
***
>Creating Commands

The Command Handler takes an array of command and replacer classes to function. A multifile system is optimal. A way to implement this would be a folder containing JS files of every command with an `index.js` that would require every command (Looping on an `fs.readdir()`) and return an array containing them.

Command File:
```js
const {
  Command
} = require('cyclone-engine')

const data = {
  name: 'say',
  desc: 'Make the bot say something.',
  options: {
    args: [{ name: 'content', mand: true }],
    restricted: true /* Make this command bot-owner only */
  },
  action: ({ args: [content] }) => content /* The command returns the content provided by the user */
}

module.exports = new Command(data)
```
{docs.class.Command}
***
>Awaiting Messages

Certain commands require multiple messages from a user. If a command asks a question, it will usually want to await a response from the user. This can be done with awaits.

Command File:
```js
const {
  Command,
  Await
} = require('cylcone-engine')

const data = {
  name: 'ban',
  desc: 'Ban a user',
  options: {
    args: [{ name: 'username', mand: true }]
  },
  action: ({ client, msg, args: [username] }) => {
    const user = client.users.find((u) => u.username.toLowerCase() === username.toLowerCase())

    if (!user) return '`Could not find user.`'

    return {
      content: `Are you sure you want to ban `${user.username}`? (Cancels in 10 seconds)`,
      awaits: new Await({
        options: {
          args: [{ name: 'response', mand: true }],
          timeout: 10000,
          onCancelFunction: () => msg.channel.createMessage('Ban cancelled.').catch((ignore) => ignore)
        },
        action: ({ args: [response] }) => {
          if (response.toLowerCase() === 'yes') {
            return client.banMember(user.id, 0, 'Banned by: ' + msg.author.username)
              .then(() => 'User banned')
              .catch(() => '`Bot does not have permissions.`')
          } else return 'Ban cancelled.'
        }
      })
    }
  }
}

module.exports = new Command(data)
```
{docs.class.Await}
***
>Creating Replacers

Replacers are passed to the command handler and are applied to messages that trigger commands. Using keywords, live data can be inserted into your message as if you typed it. For example, you could replace `|TIME|` in a message with the current date and time.

Replacer File:
```js
const {
  Replacer
} = require('cyclone-engine')

const data = {
  key: 'TIME',
  desc: 'The current time',
  options: {
    args: [{ name: 'timezone' }]
  },
  action: ({ args: [timezone] }) => new Date(new Date().toLocaleString('en-US', { timeZone: timezone })).toLocaleString()
} /* If I wrote `!say |TIME America/New_York|` at 12:00PM in London on Frebruary 2nd 1996, The bot would respond with `2/2/1996, 7:00:00 AM`. (The timezone is optional)*/

module.exports = new Replacer(data)
```
{docs.class.Replacer}
***
>Constructing the Reaction Handler without the agent

The Reaction Handler is taken care of automatically when the agent is constructed and connected. However, if you would not like to use the agent, you can construct the handler separately.

```js

const {
  ReactionHandler
} = require('cyclone-engine')

const {
  reactCommands
} = require('./data/')

const handler = client.getOAuthApplication().then((app) => {
  client.connect()

  return new ReactionHandler({
    client,
    ownerID: app.owner.id,
    reactCommands
  })
})

client.on('messageReactionAdd', async (msg, emoji, userID) => handler.handle(msg, emoji, userID))
```
{docs.class.ReactionHandler}
***
>Creating React Commands

React commands listen for when any user reacts to any command with a certain emoji.

React Command File:
```js
const {
  ReactCommand
} = require('cyclone-engine')

const {
  MODERATOR_CHANNELID
} = process.env

const data = {
  emoji: '❗', /* A custom emoji would be `:name:id` (Animated emojis are `a:name:id`) */
  desc: 'Report a message to the moderators',
  action: ({ msg, user }) => {
    return {
      content: `Reported by *${user.username}*. Message link: https://discordapp.com/channels/${msg.channel.guild.id}/${msg.channel.id}/${msg.id}`,
      embed: {
        author: {
          name: msg.author.username,
          icon_url: msg.author.avatarURL
        },
        title: msg.content
      },
      options: {
        channels: MODERATOR_CHANNELID
      }
    }
  }
}

module.exports = new ReactCommand(data)
```
{docs.class.ReactCommand}
***
>Binding interfaces to messages

Interfaces are a group of emojis the bot adds to a messages. When an emoji is clicked, the bot executes the appropriate action. Interfaces can be bound manually with `ReactionHandler.prototype.bindInterface()` *See documentation*, or they can be included in the options of an action return (This includes commands, awaits, and react commands).

```js
const {
  Command,
  ReactInterface
} = require('cyclone-engine')

const {
  ADMIN_ROLEID,
  MUTED_ROLEID
}

const data = {
  name: 'manage',
  desc: 'Open an administrative control panel for a user',
  options: {
    args: [{ name: 'username', mand: true }]
  },
  action: ({ client, msg, args: [username] }) => {
    if (!msg.member.roles.includes(ADMIN_ROLEID)) return '`You are not authorized.`'

    const user = msg.channel.guild.members.find((u) => u.username.toLowerCase() === username.toLowerCase())

    if (!user) return '`Could not find user.`'

    const muteButton = user.roles.includes(MUTED_ROLEID)
      ? new ReactCommand({
        emoji '😮', /* Unmute */
        action: () => {
          return user.removeRole(MUTED_ROLEID, 'Unmuted by: ' + msg.author.username)
            .then(() => 'User unmuted')
            .catch(() => 'Missing permissions')
        }
      })
      : new ReactCommand({
        emoji: '🤐', /* Mute */
        action: () => {
          return user.addRole(MUTED_ROLEID, 'Muted by: ' + msg.author.username)
            .then(() => 'User muted')
            .catch(() => 'Missing permissions')
        }
      })

    return {
      content: `**${user.username}#${user.descriminator}**`,
      options: {
        reactInterface: new ReactInterface({
          buttons: [
            muteButton,
            new ReactCommand({
              emoji: '👢', /* Kick */
              action: () => user.kick('Kicked by: ' + msg.author.username).catch(() => 'Missing permissions')
            }),
            new ReactCommand({
              emoji: '🔨', /* Ban */
              action: () => user.ban('Banned by: ' + msg.author.username).catch(() => 'Missing permissions')
            })
          ],
          options: {
            deleteAfterUse: true
          }
        })
      }
    }
  }
}

module.exports = new Command(data)
```
{docs.class.ReactInterface}
***
##### Design sparked by [Alex Taxiera](https://github.com/alex-taxiera)