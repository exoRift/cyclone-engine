<img src="assets/Splash.png" alt="Splash Banner" width="500"/>

[![CircleCI](https://circleci.com/gh/mets11rap/cyclone-engine/tree/master.svg?style=svg)](https://circleci.com/gh/mets11rap/cyclone-engine/tree/master)
[![codecov](https://codecov.io/gh/mets11rap/cyclone-engine/branch/master/graph/badge.svg)](https://codecov.io/gh/mets11rap/cyclone-engine)

An advanced bot engine for Discord
-
**What can Cyclone do?**

- Manage and automate connections to the Discord API

- Handle commands with capability, versatility, and ease

- Stop your bot from crashing due to errors

- Integrate automated actions

- Simplify how your database is integrated into your systems

- Auto generate command info

- Log and track command usage (Tracking coming soon)

- Create interactive menus with awaited actions and reactions

- Have you bot do what you want it to

- Do stuff with your bot's response after it's been sent

# Documentation
>Prerequisites

`eris` - You need to install Eris and supply it to the Agent or Command Handler. Eris is supplied to allow custom Eris classes to be used by the engine.

`pg, mysql, sqlite, etc.` - In order for the database wrapper, `simple-knex` to function, the database driver you are using must be installed.

`dblapi.js` - If you plan on integrating the Discord Bot Labs API into your bot, make sure to have this installed.

>Constructing the Agent class.

The Agent class is the main manager of the bot. This will be controlling automated actions as well as call the Command Handler.
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

<font size='+1' color='#a0a0a0'>Class representing a bot Agent.</font>

---
Parameter|Type|Description|Default
---------|----|-----------|-------
data|Object|The agent data.|<font color='red'>X</font>
data<span>.</span>Eris|Eris|The Eris class the system runs off of.|<font color='red'>X</font>
data<span>.</span>token|String|The token to log in to the Discord API with.|<font color='red'>X</font>
data<span>.</span>chData|Object|The commands and replacers the bot will respond to|{}
data<span>.</span>chData<span>.</span>commands|Map|The commands for the bot.|<font color='red'>X</font>
data<span>.</span>chData<span>.</span>replacers|Map|The replacers for the bot.|<font color='red'>X</font>
data<span>.</span>chData<span>.</span>replacerBraces|Object|The braces that invoke a replacer.|<font color='red'>X</font>
data<span>.</span>chData<span>.</span>replacerBraces<span>.</span>open|String|The opening brace.|'\|'
data<span>.</span>chData<span>.</span>replacerBraces<span>.</span>close|String|The closing brace.|<font color='red'>X</font>
data<span>.</span>databaseOptions|Object|The info for the database the bot utilizes.|<font color='red'>X</font>
data<span>.</span>databaseOptions<span>.</span>connectionURL|String|The URL for connecting to the bot's database.|<font color='red'>X</font>
data<span>.</span>databaseOptions<span>.</span>client|String|The database driver being used.|<font color='red'>X</font>
data<span>.</span>databaseOptions<span>.</span>tables|Object[]|The initial tables to set up for the database.|<font color='red'>X</font>
data<span>.</span>databaseOptions<span>.</span>clearEmptyRows|String[]|The list of tables to have their unchanged from default rows cleared.|<font color='red'>X</font>
data<span>.</span>agentOptions|Object|Options for the agent.|{}
data<span>.</span>agentOptions<span>.</span>connectRetryLimit|Number|How many times the agent will attempt to establish a connection with Discord before giving up.|10
data<span>.</span>agentOptions<span>.</span>prefix|String|The prefix for bot commands.|'!'
data<span>.</span>agentOptions<span>.</span>dblToken|String|The token used to connect to the Discord Bot Labs API.|<font color='red'>X</font>
data<span>.</span>agentOptions<span>.</span>loopFunction|function(Agent)|A function that will run every loopInterval amount of ms, supplied the agent.|<font color='red'>X</font>
data<span>.</span>agentOptions<span>.</span>loopInterval|Number|The interval at which the loopFunction runs.|30000
data<span>.</span>agentOptions<span>.</span>logFunction|function(msg: Eris.Message, res: CommandResults): String|A function that returns a string that's logged for every command.|<font color='red'>X</font>

>Constructing the Command Handler.

The Command Handler is taken care of automatically when the Agent is constructed. However, if you would not like to use the Agent, you can construct the handler separately.
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
    data: require('./data')
  })
})

client.on('messageCreate', async (msg) => {
  await handler
  handler.handle(msg)
})
```
<font size='+2'>CommandHandler</font>

<font size='+1' color='#a0a0a0'>A class reprsenting the command handler.</font>

---
Parameter|Type|Description|Default
---------|----|-----------|-------
data|Object|The command handler data.|<font color='red'>X</font>
data<span>.</span>agent|Agent|The agent managing the bot.|{}
data<span>.</span>prefix|String|The prefix of commands.|'!'
data<span>.</span>client|Eris.Client|The Eris client.|<font color='red'>X</font>
data<span>.</span>ownerID|String|The ID of the bot owner.|<font color='red'>X</font>
data<span>.</span>knex|QueryBuilder|The simple-knex query builder.|<font color='red'>X</font>
data<span>.</span>commands|Command[]\|Command|Map of commands to load initially.|<font color='red'>X</font>
data<span>.</span>replacers|Replacer[]\|Replacer|Map of the message content replacers to load initially.|<font color='red'>X</font>
data<span>.</span>replacerBraces|Object|The braces that invoke a replacer.|{}
data<span>.</span>replacerBraces<span>.</span>open|String|The opening brace.|'\|'
data<span>.</span>replacerBraces<span>.</span>close|String|The closing brace.|'\|'

>Creating Commands.

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
data|Object|The command data.|<font color='red'>X</font>
data<span>.</span>name|String|The command name.|<font color='red'>X</font>
data<span>.</span>desc|String|The command description.|<font color='red'>X</font>
data<span>.</span>options|Object|The command options.|{}
data<span>.</span>options<span>.</span>args|Object[]|List of arguments that the command takes.|<font color='red'>X</font>
data<span>.</span>options<span>.</span>dbTable|String|Name of database table to fetch, data is passed through to action with the same name.|''
data<span>.</span>options<span>.</span>restricted|Boolean|Whether or not this command is restricted to admin only.|false
data<span>.</span>action|function(CommandData): (CommandResults\|String)|The command action.|<font color='red'>X</font>