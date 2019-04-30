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
<font size='+2'>Agent</font>
Parameter|Function|Default
---------|--------|-------
data|The agent data|X
data.Eris|The Eris client the system runs off of|X
data.token|The Discord token for the bot to connect to|X
data.chData|The commands and replacers the bot will respond to|{}