<img src="assets/Splash.png" alt="Splash Banner" width="500"/>

[![CircleCI](https://circleci.com/gh/mets11rap/cyclone-engine/tree/master.svg?style=svg)](https://circleci.com/gh/mets11rap/cyclone-engine/tree/master)
[![codecov](https://codecov.io/gh/mets11rap/cyclone-engine/branch/master/graph/badge.svg)](https://codecov.io/gh/mets11rap/cyclone-engine)

# An advanced bot engine for Discord
**What can Cyclone do?**

- Manage and automate connections to the Discord API

- Handle commands with capability, versatility, and ease

- Stop your bot from crashing due to errors

- Integrate automated actions

- Simplify how your database is integrated into your systems

- Auto generate command info

- Log and track command usage (Tracking coming soon)

- Create interactive menus with awaited actions and reactions (Reactions coming soon)

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
      agent._client.getDMChannel(agent._CommandHandler.ownerId).then((channel) => {
        channel.createMessage('Current server count is: ' + agent._client.guilds.size)
      })
    }, /* DM the number of guilds the bot is in to the owner */
    loopInterval: 1800000, /* 30 minutes */
    logFunction: (msg, { command }) => `${msg.timestamp} - **${msg.author.username}** > *${command.name}*` /* "5000000 - **mets11rap** > *help*" */
  }
})
```
{docs.constructors: Agent}

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
{docs.constructors: CommandHandler}

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
{docs.constructors: Command}