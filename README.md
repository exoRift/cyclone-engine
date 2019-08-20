<img src="assets/Splash.png" alt="Splash Banner" width="500"/>

[![CircleCI](https://circleci.com/gh/mets11rap/cyclone-engine/tree/master.svg?style=svg)](https://circleci.com/gh/mets11rap/cyclone-engine/tree/master)
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

- Stop your bot from crashing due to errors

- Integrate automated actions

- Simplify how your database is integrated into your systems

- Auto generate command info

- Utilize a built-in help menu

- Get command results for analysis and logging

- Create interactive menus with awaited actions and reactions

- Complete freedom of bot design

# Examples of bots that use Cyclone
- <font size='+1'>[**GuildLink**](https://github.com/mets11rap/guildlink)</font>

# Getting started
>Prerequisites

`eris` - You need to install Eris and supply it to the agent. Eris is supplied to allow custom Eris classes to be used by the engine.

`pg, mysql, sqlite, etc.` - In order for the database wrapper, `simple-knex`, to function, the database driver you are using must be installed.

`dblapi.js` - If you plan on integrating the Discord Bot Labs API into your bot, make sure to have this installed.

<a href='https://mets11rap.github.io/cyclone-engine/' style='color: #4747d1'><font size='+2'>**Documentation**</font></a>

```
npm i cyclone-engine
```

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
    tables: [{
      name: 'users',
      columns: [{
        name: 'score',
        type: 'integer',
        default: 0
      }]
    }],
    clearEmptyRows: ['users']
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
    postMessageFunction: (msg, { command }) => console.log(`${msg.timestamp} - **${msg.author.username}** > *${command.name}*`),
    postReactionFunction: (msg, { reactCommand }) => console.log(`${msg.timestamp} - **${msg.author.username}** > *${reactCommand.name}*`)
  }
})
```
<font size='+2'>Agent</font>

<font size='+1' color='#a0a0a0'>The main controlling agent of the bot.</font>

---
Parameter|Type|Description|Default
---------|----|-----------|-------
data<span>.</span>Eris|<font color='#f5c842'>Eris</font>|The Eris class the system runs off of.|<font color='red'>X</font>
data<span>.</span>token|<font color='#f5c842'>String</font>|The token to log in to the Discord API with.|<font color='red'>X</font>
[data<span>.</span>handlerData]|<font color='#f5c842'>Object</font>|The commands and replacers the bot will respond to|<font color='#f5c842'>{}</font>
[data<span>.</span>handlerData<span>.</span>commands]|<font color='#f5c842'>Array<span><</span>Command<span>></span></font>|The commands for the bot.|*
[data<span>.</span>handlerData<span>.</span>replacers]|<font color='#f5c842'>Array<span><</span>Replacer<span>></span></font>|The replacers for the bot.|*
[data<span>.</span>handlerData<span>.</span>reactCommands]|<font color='#f5c842'>Array<span><</span>ReactCommand<span>></span></font>|The commands that trigger on reactions.|*
[data<span>.</span>handlerData<span>.</span>replacerBraces]|<font color='#f5c842'>Object</font>|The braces that invoke a replacer.|*
[data<span>.</span>handlerData<span>.</span>replacerBraces<span>.</span>open]|<font color='#f5c842'>String</font>|The opening brace.|<font color='#f5c842'>'\|'</font>
[data<span>.</span>handlerData<span>.</span>replacerBraces<span>.</span>close]|<font color='#f5c842'>String</font>|The closing brace.|*
[data<span>.</span>databaseOptions]|<font color='#f5c842'>Object</font>|The info for the database the bot utilizes.|<font color='#f5c842'>{}</font>
data<span>.</span>databaseOptions<span>.</span>connectionURL|<font color='#f5c842'>String</font>|The URL for connecting to the bot's database.|<font color='red'>X</font>
data<span>.</span>databaseOptions<span>.</span>client|<font color='#f5c842'>String</font>|The database driver being used.|<font color='red'>X</font>
[data<span>.</span>databaseOptions<span>.</span>tables]|<font color='#f5c842'>Array<span><</span>Object<span>></span></font>|The initial tables to set up for the database.|<font color='#f5c842'>[]</font>
[data<span>.</span>databaseOptions<span>.</span>clearDefaultRows]|<font color='#f5c842'>Array<span><</span>String<span>></span></font>|The list of tables to have their unchanged from default rows cleared.|<font color='#f5c842'>[]</font>
[data<span>.</span>agentOptions]|<font color='#f5c842'>Object</font>|Options for the agent.|<font color='#f5c842'>{}</font>
[data<span>.</span>agentOptions<span>.</span>connectRetryLimit]|<font color='#f5c842'>Number</font>|How many times the agent will attempt to establish a connection with Discord before giving up.|<font color='#f5c842'>10</font>
[data<span>.</span>agentOptions<span>.</span>prefix]|<font color='#f5c842'>String</font>|The prefix for bot commands.|<font color='#f5c842'>'!'</font>
[data<span>.</span>agentOptions<span>.</span>statusMessage]|<font color='#f5c842'>Object</font>\|<font color='#f5c842'>statusMessageFunction</font>|The status for the bot. It can be an object containing the data, or a callback function for each shard. By default, it's the bot's prefix.|*
[data<span>.</span>agentOptions<span>.</span>dblToken]|<font color='#f5c842'>String</font>|The token used to connect to the Discord Bot Labs API.|*
[data<span>.</span>agentOptions<span>.</span>loopFunction]|<font color='#f5c842'>Object</font>|A function that will run every loopInterval amount of ms, supplied the agent.|<font color='#f5c842'>{}</font>
[data<span>.</span>agentOptions<span>.</span>loopFunction<span>.</span>func]|<font color='#f5c842'>function</font>|The function.|*
[data<span>.</span>agentOptions<span>.</span>loopFunction<span>.</span>interval]|<font color='#f5c842'>Number</font>|The interval at which the loopFunction runs.|<font color='#f5c842'>30000</font>
[data<span>.</span>agentOptions<span>.</span>fireOnEdit]|<font color='#f5c842'>Boolean</font>|Whether the command handler is called when a command is edited or not.|*
[data<span>.</span>agentOptions<span>.</span>fireOnReactionRemove]|<font color='#f5c842'>Boolean</font>|Whether the reaction handler is triggered on the removal of reactions as well.|*
[data<span>.</span>agentOptions<span>.</span>postMessageFunction]|<font color='#f5c842'>postMessageFunction</font>|A function that runs after every message whether it triggers a command or not.|*
[data<span>.</span>agentOptions<span>.</span>postReactionFunction]|<font color='#f5c842'>postReactionFunction</font>|A function that runs after every reaction whether it triggers a react command or not.|*
[data<span>.</span>agentOptions<span>.</span>maxInterfaces]|<font color='#f5c842'>Number</font>|The maximum amount of reaction interfaces cached before they start getting deleted.|<font color='#f5c842'>1500</font>
data|<font color='#f5c842'>Object</font>|The agent data.|<font color='red'>X</font>
[data<span>.</span>agentOptions<span>.</span>userBlacklist]|<font color='#f5c842'>Array<span><</span>String<span>></span></font>|An array of user IDs to be blacklisted from using the bot.|<font color='#f5c842'>[]</font>

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
[data<span>.</span>agent]|<font color='#f5c842'>Agent</font>|The agent managing the bot.|<font color='#f5c842'>{}</font>
[data<span>.</span>prefix]|<font color='#f5c842'>String</font>|The prefix of commands.|<font color='#f5c842'>'!'</font>
data<span>.</span>client|<font color='#f5c842'>Eris.Client</font>|The Eris client.|<font color='red'>X</font>
data<span>.</span>ownerID|<font color='#f5c842'>String</font>|The ID of the bot owner.|<font color='red'>X</font>
[data<span>.</span>knex]|<font color='#f5c842'>QueryBuilder</font>|The simple-knex query builder.|*
[data<span>.</span>commands]|<font color='#f5c842'>Array<span><</span>Command<span>></span></font>\|<font color='#f5c842'>Command</font>|Array of commands to load initially.|<font color='#f5c842'>[]</font>
[data<span>.</span>replacers]|<font color='#f5c842'>Array<span><</span>Replacer<span>></span></font>\|<font color='#f5c842'>Replacer</font>|Array of the message content replacers to load initially.|<font color='#f5c842'>[]</font>
[data<span>.</span>options]|<font color='#f5c842'>Object</font>|Additional options for the command handler.|<font color='#f5c842'>{}</font>
[data<span>.</span>options<span>.</span>replacerBraces]|<font color='#f5c842'>Object</font>|The braces that invoke a replacer.|<font color='#f5c842'>{}</font>
[data<span>.</span>options<span>.</span>replacerBraces<span>.</span>open]|<font color='#f5c842'>String</font>|The opening brace.|<font color='#f5c842'>'\|'</font>
[data<span>.</span>options<span>.</span>replacerBraces<span>.</span>close]|<font color='#f5c842'>String</font>|The closing brace.|<font color='#f5c842'>'\|'</font>
data|<font color='#f5c842'>Object</font>|The command handler data.|<font color='red'>X</font>
[data<span>.</span>options<span>.</span>ignoreCodes]|<font color='#f5c842'>Array<span><</span>Number<span>></span></font>|The Discord error codes to ignore.|<font color='#f5c842'>[]</font>

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
data<span>.</span>name|<font color='#f5c842'>String</font>|The command name.|<font color='red'>X</font>
data<span>.</span>desc|<font color='#f5c842'>String</font>|The command description.|<font color='red'>X</font>
[data<span>.</span>options]|<font color='#f5c842'>Object</font>|The command options.|<font color='#f5c842'>{}</font>
[data<span>.</span>options<span>.</span>args]|<font color='#f5c842'>Array<span><</span>Argument<span>></span></font>|The arguments for the command.|<font color='#f5c842'>[]</font>
[data<span>.</span>options<span>.</span>aliases]|<font color='#f5c842'>Array<span><</span>String<span>></span></font>\|<font color='#f5c842'>String</font>|Other names that trigger the command.|<font color='#f5c842'>[]</font>
data<span>.</span>options<span>.</span>dbTable|<font color='#f5c842'>String</font>|The name of database table to fetch user data from (primary key must be named `id`).|<font color='red'>X</font>
[data<span>.</span>options<span>.</span>restricted]|<font color='#f5c842'>Boolean</font>|Whether or not this command is restricted to admin only.|*
data|<font color='#f5c842'>Object</font>|The command data.|<font color='red'>X</font>
data<span>.</span>action|<font color='#f5c842'>commandAction</font>|The command action.|<font color='red'>X</font>

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
<font size='+2'>Await</font>

<font size='+1' color='#a0a0a0'>A class used for the awaiting of a criteria-matching message.</font>

---
Parameter|Type|Description|Default
---------|----|-----------|-------
[data<span>.</span>options]|<font color='#f5c842'>Object</font>|The options for the await|<font color='#f5c842'>{}</font>
[data<span>.</span>options<span>.</span>args]|<font color='#f5c842'>Array<span><</span>Argument<span>></span></font>|The arguments for the await.|<font color='#f5c842'>[]</font>
[data<span>.</span>options<span>.</span>check]|<font color='#f5c842'>checkFunction</font>|The condition to be met for the await to trigger.|<font color='#f5c842'>() => true</font>
[data<span>.</span>options<span>.</span>timeout]|<font color='#f5c842'>Number</font>|How long until the await expires.|<font color='#f5c842'>15000</font>
[data<span>.</span>options<span>.</span>oneTime]|<font color='#f5c842'>Boolean</font>|Whether a non-triggering message cancels the await.|*
[data<span>.</span>options<span>.</span>refreshOnUse]|<font color='#f5c842'>Boolean</font>|Whether the timeout for the await refreshes after a use.|*
[data<span>.</span>options<span>.</span>onCancelFunction]|<font color='#f5c842'>function</font>|A function to run once the await expires or is cancelled.|*
[data<span>.</span>options<span>.</span>channel]|<font color='#f5c842'>String</font>|The ID of the channel to await the message. (By default, it's the channel the command was called in.)|*
data|<font color='#f5c842'>Object</font>|The await data.|<font color='red'>X</font>
data<span>.</span>action|<font color='#f5c842'>awaitAction</font>|The await action.|<font color='red'>X</font>

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
data<span>.</span>key|<font color='#f5c842'>String</font>|The key that invokes the replacer.|<font color='red'>X</font>
data<span>.</span>desc|<font color='#f5c842'>String</font>|The description of the replacer.|<font color='red'>X</font>
[data<span>.</span>options]|<font color='#f5c842'>Object</font>|The options for the replacer.|<font color='#f5c842'>{}</font>
[data<span>.</span>options<span>.</span>args]|<font color='#f5c842'>Array<span><</span>Argument<span>></span></font>|The arguments for the replacer.|<font color='#f5c842'>[]</font>
data|<font color='#f5c842'>Object</font>|The data to make a replacer with.|<font color='red'>X</font>
data<span>.</span>action|<font color='#f5c842'>replacerAction</font>|A function returning the string to replace with.|<font color='red'>X</font>

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
[data<span>.</span>agent]|<font color='#f5c842'>Agent</font>|The agent managing the bot.|*
data<span>.</span>client|<font color='#f5c842'>Eris.Client</font>|The Eris client.|<font color='red'>X</font>
data<span>.</span>ownerID|<font color='#f5c842'>String</font>|The ID of the bot owner.|<font color='red'>X</font>
[data<span>.</span>knex]|<font color='#f5c842'>QueryBuilder</font>|The simple-knex query builder.|*
[data<span>.</span>reactCommands]|<font color='#f5c842'>Array<span><</span>ReactCommand<span>></span></font>\|<font color='#f5c842'>ReactCommand</font>|rray of reaction commands to load initially.|<font color='#f5c842'>[]</font>
[data<span>.</span>options]|<font color='#f5c842'>Object</font>|Options for the reaction handler.|<font color='#f5c842'>{}</font>
[data<span>.</span>options<span>.</span>maxInterfaces]|<font color='#f5c842'>Number</font>|The maximum amount of interfaces cached before they start getting deleted.|<font color='#f5c842'>1500</font>
data|<font color='#f5c842'>Object</font>|The reaction handler data.|<font color='red'>X</font>
[data<span>.</span>options<span>.</span>ignoreCodes]|<font color='#f5c842'>Array<span><</span>Number<span>></span></font>|The Discord error codes to ignore.|<font color='#f5c842'>[]</font>

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
data<span>.</span>emoji|<font color='#f5c842'>String</font>|The emoji that triggers the command.|<font color='red'>X</font>
data<span>.</span>desc|<font color='#f5c842'>String</font>|The description of the react command.|<font color='red'>X</font>
data<span>.</span>options|<font color='#f5c842'>Object</font>|Additional options for the react command|<font color='red'>X</font>
[data<span>.</span>options<span>.</span>restricted]|<font color='#f5c842'>Boolean</font>|Whether the react command is restricted to selected users or not.|*
[data<span>.</span>options<span>.</span>designatedUsers]|<font color='#f5c842'>Array<span><</span>String<span>></span></font>\|<font color='#f5c842'>String</font>|The IDs of the users who can use the react command. By default, if restricted is true, it's the owner of the message reacted on.|*
[data<span>.</span>options<span>.</span>dbTable]|<font color='#f5c842'>String</font>|Name of database table to fetch user data from (primary key must be named `id`).|*
[data<span>.</span>options<span>.</span>removeReaction]|<font color='#f5c842'>Boolean</font>|Whether the triggering reaction is removed after executed or not.|*
data|<font color='#f5c842'>Object</font>|The react command data.|<font color='red'>X</font>
data<span>.</span>action|<font color='#f5c842'>reactCommandAction</font>|The react command action.|<font color='red'>X</font>

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
data<span>.</span>buttons|<font color='#f5c842'>Array<span><</span>ReactCommand<span>></span></font>\|<font color='#f5c842'>ReactCommand</font>|The buttons of the interface.|<font color='red'>X</font>
[data<span>.</span>options]|<font color='#f5c842'>Object</font>|The options for the interface.|<font color='#f5c842'>{}</font>
[data<span>.</span>options<span>.</span>restricted]|<font color='#f5c842'>Boolean</font>|Whether all buttons of the interface are restricted to selected users or not.|*
[data<span>.</span>options<span>.</span>designatedUsers]|<font color='#f5c842'>Array<span><</span>String<span>></span></font>\|<font color='#f5c842'>String</font>|The IDs of the users who can use the react interface. By default, if restricted is true, it's the owner of the message reacted on.|*
[data<span>.</span>options<span>.</span>dbTable]|<font color='#f5c842'>String</font>|Name of database table to fetch user data from (primary key must be named `id`).|*
[data<span>.</span>options<span>.</span>deleteAfterUse]|<font color='#f5c842'>Boolean</font>|Whether the interface is deleted after a use or not.|*
data|<font color='#f5c842'>Object</font>|The react interface data.|<font color='red'>X</font>
[data<span>.</span>options<span>.</span>removeReaction]|<font color='#f5c842'>Boolean</font>|Whether the triggering reaction is removed after executed or not.|*