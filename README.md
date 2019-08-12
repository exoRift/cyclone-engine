<img src="assets/Splash.png" alt="Splash Banner" width="500"/>

[![CircleCI](https://circleci.com/gh/mets11rap/cyclone-engine/tree/master.svg?style=svg)](https://circleci.com/gh/mets11rap/cyclone-engine/tree/master)
[![codecov](https://codecov.io/gh/mets11rap/cyclone-engine/branch/master/graph/badge.svg)](https://codecov.io/gh/mets11rap/cyclone-engine)
[![Discord Server](https://img.shields.io/badge/-Support%20Server-b.svg?colorA=697ec4&colorB=7289da&logo=discord)](https://discord.gg/Rqd8SJ9)
![Version](https://img.shields.io/github/package-json/v/mets11rap/cyclone-engine.svg?label=Version)

An advanced bot engine for Discord
-
**What can Cyclone do?**

- Manage and automate connections to the Discord API

- Handle commands with capability, versatility, and ease

- Add user flexibility to your bot with command aliases

- Stop your bot from crashing due to errors

- Integrate automated actions

- Simplify how your database is integrated into your systems

- Auto generate command info

- Utilize a built-in help menu

- Get command results for analysis and logging

- Create interactive menus with awaited actions and reactions

- Complete freedom of bot design

# Examples of bots that use Cyclone
<font size='+1'>[**GuildLink**](https://github.com/mets11rap/guildlink)</font>

# Getting started
>Prerequisites

`eris` - You need to install Eris and supply it to the agent or Command Handler. Eris is supplied to allow custom Eris classes to be used by the engine.

`pg, mysql, sqlite, etc.` - In order for the database wrapper, `simple-knex` to function, the database driver you are using must be installed.

`dblapi.js` - If you plan on integrating the Discord Bot Labs API into your bot, make sure to have this installed.

>Constructing the Agent class

The Agent class is the main manager of the bot. This will be controlling automated actions as well as call the Command & Reaction Handler.
```js
const {
  TOKEN,
  DBL_TOKEN,
  DATABASE_URL
} = process.env

const Eris = require('eris')
const {
  Agent 
} = require('cyclone-engine')

const agentData = require('./data')

const agent = new Agent({
  Eris,
  token: TOKEN,
  chData: agentData,
  databaseOptions: {
    connectionURL: DATABASE_URL,
    client: 'pg',
    tables: [
      {
        name: 'users',
        columns: [
          {
            name: 'score',
            type: 'integer',
            default: 0
          }
        ]
      }
    ],
    clearEmptyRows: [
      'users'
    ]
  },
  agentOptions: {
    connectRetryLimit: 5,
    prefix: '.',
    dblToken: DBL_TOKEN,
    loopFunction: (agent) => {
      agent._client.getDMChannel(agent._CommandHandler.ownerId).then((channel) =>
        channel.createMessage('Current server count is: ' + agent._client.guilds.size)
      )
    }, /* DM the number of guilds the bot is in to the owner */
    loopInterval: 1800000, /* 30 minutes */
    logFunction: (msg, { command }) => `${msg.timestamp} - **${msg.author.username}** > *${command.name}*` /* "5000000 - **mets11rap** > *help*" */
  }
})
```
<font size='+2'>Agent</font>

<font size='+1' color='#a0a0a0'>The main controlling agent of the bot.</font>

---
Parameter|Type|Description|Default
---------|----|-----------|-------
data|Object|The agent data.|*
data<span>.</span>Eris|Eris|The Eris class the system runs off of.|*
data<span>.</span>token|String|The token to log in to the Discord API with.|*
[data<span>.</span>handlerData]|Object|The commands and replacers the bot will respond to|<font color='#f5c842'>{}</font>
[data<span>.</span>handlerData<span>.</span>commands]|Array<span><</span>Command<span>></span>|The commands for the bot.|*
[data<span>.</span>handlerData<span>.</span>replacers]|Array<span><</span>Replacer<span>></span>|The replacers for the bot.|*
[data<span>.</span>handlerData<span>.</span>reactCommands]|Array<span><</span>ReactCommand<span>></span>|The commands that trigger on reactions.|*
[data<span>.</span>handlerData<span>.</span>replacerBraces]|Object|The braces that invoke a replacer.|*
[data<span>.</span>handlerData<span>.</span>replacerBraces<span>.</span>open]|String|The opening brace.|<font color='#f5c842'>'\|'</font>
[data<span>.</span>handlerData<span>.</span>replacerBraces<span>.</span>close]|String|The closing brace.|*
[data<span>.</span>databaseOptions]|Object|The info for the database the bot utilizes.|<font color='#f5c842'>{}</font>
data<span>.</span>databaseOptions<span>.</span>connectionURL|String|The URL for connecting to the bot's database.|*
data<span>.</span>databaseOptions<span>.</span>client|String|The database driver being used.|*
[data<span>.</span>databaseOptions<span>.</span>tables]|Array<span><</span>Object<span>></span>|The initial tables to set up for the database.|<font color='#f5c842'>[]</font>
[data<span>.</span>databaseOptions<span>.</span>clearEmptyRows]|Array<span><</span>String<span>></span>|The list of tables to have their unchanged from default rows cleared.|<font color='#f5c842'>[]</font>
[data<span>.</span>agentOptions]|Object|Options for the agent.|<font color='#f5c842'>{}</font>
[data<span>.</span>agentOptions<span>.</span>connectRetryLimit]|Number|How many times the agent will attempt to establish a connection with Discord before giving up.|<font color='#f5c842'>10</font>
[data<span>.</span>agentOptions<span>.</span>prefix]|String|The prefix for bot commands.|<font color='#f5c842'>'!'</font>
[data<span>.</span>agentOptions<span>.</span>statusMessage]|Object<span>\|</span>statusMessageFunction|The status for the bot. It can be an object containing the data, or a callback function for each shard. By default, it's the bot's prefix.|*
[data<span>.</span>agentOptions<span>.</span>dblToken]|String|The token used to connect to the Discord Bot Labs API.|*
[data<span>.</span>agentOptions<span>.</span>loopFunction]|Object|A function that will run every loopInterval amount of ms, supplied the agent.|<font color='#f5c842'>{}</font>
[data<span>.</span>agentOptions<span>.</span>loopFunction<span>.</span>func]|function|The function.|*
[data<span>.</span>agentOptions<span>.</span>loopFunction<span>.</span>interval]|Number|The interval at which the loopFunction runs.|<font color='#f5c842'>30000</font>
[data<span>.</span>agentOptions<span>.</span>fireOnEdit]|Boolean|Whether the command handler is called when a command is edited or not.|<font color='#f5c842'>false</font>
[data<span>.</span>agentOptions<span>.</span>fireOnReactionRemove]|Boolean|Whether the reaction handler is triggered on the removal of reactions as well.|<font color='#f5c842'>false</font>
[data<span>.</span>agentOptions<span>.</span>postMessageFunction]|postMessageFunction|A function that runs after every message if it triggers a command.|*
[data<span>.</span>agentOptions<span>.</span>maxInterfaces]|Number|The maximum amount of reaction interfaces cached before they start getting deleted.|<font color='#f5c842'>1500</font>

>Constructing the Command Handler without the agent

The Command Handler is taken care of automatically when the agent is constructed and connected. However, if you would not like to use the agent, you can construct the handler separately.
```js
const {
  TOKEN
} = process.env

const Eris = require('eris')
const client = new Eris(TOKEN)

const {
  _CommandHandler
} = require('cyclone-engine')

const handler = client.getOAuthApplication().then((app) => {
  return new _CommandHandler({
    client,
    ownerID: app.owner.id,
    ...require('./data')
  })
})

client.on('messageCreate', async (msg) => {
  await handler

  handler.handle(msg)
})
```
<font size='+2'>CommandHandler</font>

<font size='+1' color='#a0a0a0'>The module that handles incoming commands.</font>

---
Parameter|Type|Description|Default
---------|----|-----------|-------
data|Object|The command handler data.|*
[data<span>.</span>agent]|Agent|The agent managing the bot.|<font color='#f5c842'>{}</font>
[data<span>.</span>prefix]|String|The prefix of commands.|<font color='#f5c842'>'!'</font>
data<span>.</span>client|Eris.Client|The Eris client.|*
data<span>.</span>ownerID|String|The ID of the bot owner.|*
[data<span>.</span>knex]|QueryBuilder|The simple-knex query builder.|*
[data<span>.</span>commands]|Array<span><</span>Command<span>></span><span>\|</span>Command|Array of commands to load initially.|<font color='#f5c842'>[]</font>
[data<span>.</span>replacers]|Array<span><</span>Replacer<span>></span><span>\|</span>Replacer|Array of the message content replacers to load initially.|<font color='#f5c842'>[]</font>
[data<span>.</span>options]|Object|Additional options for the command handler.|<font color='#f5c842'>{}</font>
[data<span>.</span>options<span>.</span>replacerBraces]|Object|The braces that invoke a replacer.|<font color='#f5c842'>{}</font>
[data<span>.</span>options<span>.</span>replacerBraces<span>.</span>open]|String|The opening brace.|<font color='#f5c842'>'\|'</font>
[data<span>.</span>options<span>.</span>replacerBraces<span>.</span>close]|String|The closing brace.|<font color='#f5c842'>'\|'</font>
[data<span>.</span>options<span>.</span>ignoreCodes]|Array<span><</span>Number<span>></span>|The Discord error codes to ignore.|<font color='#f5c842'>[]</font>

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
    restricted: true /* Make this command admin only */
  },
  action: ({ args: [content] }) => content /* The command returns the content provided by the user */
}

module.exports = new Command(data)
```
<font size='+2'>Command</font>

<font size='+1' color='#a0a0a0'>Class representing a command.</font>

---
Parameter|Type|Description|Default
---------|----|-----------|-------
data|Object|The command data.|*
data<span>.</span>name|String|The command name.|*
data<span>.</span>desc|String|The command description.|*
[data<span>.</span>options]|Object|The command options.|<font color='#f5c842'>{}</font>
[data<span>.</span>options<span>.</span>args]|Array<span><</span>Argument<span>></span>|The arguments for the command.|<font color='#f5c842'>[]</font>
[data<span>.</span>options<span>.</span>aliases]|Array<span><</span>String<span>></span>|Other names that trigger the command.|<font color='#f5c842'>[]</font>
data<span>.</span>options<span>.</span>dbTable|String|The name of database table to fetch user data from (primary key must be named `id`).|*
[data<span>.</span>options<span>.</span>restricted]|Boolean|Whether or not this command is restricted to admin only.|<font color='#f5c842'>false</font>
data<span>.</span>action|commandAction|The command action.|*

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
      wait: new Await({
        options: {
          args: [{ name: 'response', mand: true }],
          timeout: 10000
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
<font size='+2'>Await</font>

<font size='+1' color='#a0a0a0'>A class used for the awaiting of a criteria-matching message.</font>

---
Parameter|Type|Description|Default
---------|----|-----------|-------
data|Object|The await data.|*
[data<span>.</span>options]|Object|The options for the await|<font color='#f5c842'>{}</font>
[data<span>.</span>options<span>.</span>args]|Array<span><</span>Argument<span>></span>|The arguments for the await.|<font color='#f5c842'>[]</font>
[data<span>.</span>options<span>.</span>check]|checkFunction|The condition to be met for the await to trigger.|<font color='#f5c842'>() => true</font>
[data<span>.</span>options<span>.</span>timeout]|Number|How long until the await cancels.|<font color='#f5c842'>15000</font>
[data<span>.</span>options<span>.</span>oneTime]|Boolean|Whether a non-triggering message cancels the await.|<font color='#f5c842'>false</font>
[data<span>.</span>options<span>.</span>refreshOnUse]|Boolean|Whether the timeout for the await refreshes after a use.|<font color='#f5c842'>false</font>
[data<span>.</span>options<span>.</span>channel]|String|The channel to await the message. (By default, it's the channel the command was called in.)|*
data<span>.</span>action|awaitAction|The await action.|*

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
<font size='+2'>Replacer</font>

<font size='+1' color='#a0a0a0'>A class used to register keywords in a message that are replaced with live data.</font>

---
Parameter|Type|Description|Default
---------|----|-----------|-------
data|Object|The data to make a replacer with.|*
data<span>.</span>key|String|The key that invokes the replacer.|*
data<span>.</span>desc|String|The description of the replacer.|*
[data<span>.</span>options]|Object|The options for the replacer.|<font color='#f5c842'>{}</font>
[data<span>.</span>options<span>.</span>args]|Array<span><</span>Argument<span>></span>|The arguments for the replacer.|<font color='#f5c842'>[]</font>
data<span>.</span>action|replacerAction|A function returning the string to replace with.|*

>Constructing the Reaction Handler without the agent

The Reaction Handler is taken care of automatically when the agent is constructed and connected. However, if you would not like to use the agent, you can construct the handler separately.

```js

const {
  _ReactionHandler
} = require('cyclone-engine')

const handler = client.getOAuthApplication().then((app) => {
  return new _ReactionHandler({
    client,
    ownerID: app.owner.id,
    ...require('./data')
  })
})

client.on('messageReactionAdd', async (msg, emoji, userID) => {
  await handler

  handler.handle(msg, emoji, userID)
})
```
<font size='+2'>ReactionHandler</font>

<font size='+1' color='#a0a0a0'>The module that handles incoming reactions.</font>

---
Parameter|Type|Description|Default
---------|----|-----------|-------
data|Object|The reaction handler data.|*
[data<span>.</span>agent]|Agent|The agent managing the bot.|*
data<span>.</span>client|Eris.Client|The Eris client.|*
data<span>.</span>ownerID|String|The ID of the bot owner.|*
[data<span>.</span>knex]|QueryBuilder|The simple-knex query builder.|*
[data<span>.</span>reactCommands]|Array<span><</span>ReactCommand<span>></span><span>\|</span>ReactCommand|rray of reaction commands to load initially.|<font color='#f5c842'>[]</font>
[data<span>.</span>options]|Object|Options for the reaction handler.|<font color='#f5c842'>{}</font>
[data<span>.</span>options<span>.</span>maxInterfaces]|Number|The maximum amount of interfaces cached before they start getting deleted.|<font color='#f5c842'>1500</font>
[data<span>.</span>options<span>.</span>ignoreCodes]|Array<span><</span>Number<span>></span>|The Discord error codes to ignore.|<font color='#f5c842'>[]</font>

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
        channel: MODERATOR_CHANNELID
      }
    }
  }
}

module.exports = new ReactCommand(data)
```
<font size='+2'>ReactCommand</font>

<font size='+1' color='#a0a0a0'>A class used to register commands for the command handler.</font>

---
Parameter|Type|Description|Default
---------|----|-----------|-------
data|Object|The react command data.|*
data<span>.</span>emoji|String|The emoji that triggers the command.|*
data<span>.</span>desc|String|The description of the react command.|*
data<span>.</span>options|Object|Additional options for the react command|*
[data<span>.</span>options<span>.</span>restricted]|Boolean|Whether the react command is restricted to selected users or not.|<font color='#f5c842'>false</font>
[data<span>.</span>options<span>.</span>designatedUsers]|Array<span><</span>String<span>></span><span>\|</span>String|The IDs of the users who can use the react command. By default, if restricted is true, it's the owner of the message reacted on.|*
[data<span>.</span>options<span>.</span>dbTable]|String|Name of database table to fetch user data from (primary key must be named `id`).|*
[data<span>.</span>options<span>.</span>removeReaction]|Boolean|Whether the triggering reaction is removed after executed or not.|<font color='#f5c842'>false</font>
data<span>.</span>action|reactCommandAction|The react command action.|*

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
<font size='+2'>ReactInterface</font>

<font size='+1' color='#a0a0a0'>An array of emoji button that attach to a message to do different actions.</font>

---
Parameter|Type|Description|Default
---------|----|-----------|-------
data|Object|The react interface data.|*
data<span>.</span>buttons|Array<span><</span>ReactCommand<span>></span><span>\|</span>ReactCommand|The buttons of the interface.|*
[data<span>.</span>options]|Object|The options for the interface.|<font color='#f5c842'>{}</font>
[data<span>.</span>options<span>.</span>restricted]|Boolean|Whether all buttons of the interface are restricted to selected users or not.|<font color='#f5c842'>false</font>
[data<span>.</span>options<span>.</span>designatedUsers]|Array<span><</span>String<span>></span><span>\|</span>String|The IDs of the users who can use the react interface. By default, if restricted is true, it's the owner of the message reacted on.|*
[data<span>.</span>options<span>.</span>dbTable]|String|Name of database table to fetch user data from (primary key must be named `id`).|*
[data<span>.</span>options<span>.</span>deleteAfterUse]|Boolean|Whether the interface is deleted after a use or not.|<font color='#f5c842'>false</font>
[data<span>.</span>options<span>.</span>removeReaction]|Boolean|Whether the triggering reaction is removed after executed or not.|<font color='#f5c842'>false</font>