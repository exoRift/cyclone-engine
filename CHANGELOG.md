1.5.0
-
### 

1.4.4
-
### **Important Notes**
- Shard disconnects are now only logged when there's an error provided by Eris

### **Bug Fixes**
- Fixed an issue where awaits would sometimes not cancel after success properly because the code to cancel them was in the wrong place (Previous fix did not work)

1.4.3
-
### **Important Notes**
- Eris is now an optional dependency. To install the engine without Eris, use `npm i cyclone-engine --no-optional`

### **Bug Fixes**
- Fixed an issue where `Agent.getTopPermissionLevel` would not return `Infinity` for guild owners
- Fixed an issue where awaits would sometimes not cancel after success properly because the code to cancel them was in the wrong place
- Fixed an issue with running commands in DMs
- Fixed an issue with sending responses to DMs

1.4.2
-
### **Bug Fixes**
- Fix improper intent names

1.4.1
-
### **New Handling Features**
- Tokens are now automatically prefixed with the required keyword that designates bot accounts (Phasing out of Eris in the future)
- The dynamic argument parser now specifically looks for numbers in IDs rather than any character

### **Bug Fixes**
- Fixed an issue where a 401 error would occur on using the Agent's connect method

1.4.0
-
### **New Handling Features**
- When commands are mounted, the command handler will now check if any commands have invalid mandation (an optional arg before a mandatory arg)
- You can now have server-side custom prefixes (See documentation for constructor option and methods)
- The owner ID no longer has to be supplied to handlers when used independently
- The Agent's connect method now resolves once the event handlers are initiated
- Handlers are now initiated when the current shard has connected and do not reinitiate on a reconnect
- Added 2 new argument types: `user` and `channel`. When a user provides a mention or name of the type, the Eris class instance of the type is passed to the command action
- The `data` parameter for `Agent.buildHelp` is now fully optional as well as its individual properties
- `Agent.buildHelp` new returns a react interface to scroll the help menu if embed data is supplied and the help menu is more than 1 page
- The `number` arg type now uses `parseFloat()` instead of `parseInt()`
- Massively improved argument parsing performance
- There is now a new Agent method to build an in-depth help menu for a specific command
- Added a passthrough in the Agent constructor to append Eris constructor options to the calculated intents

### **Important Notes**
- Completely redid how initial guild data is supplied to the Agent. See documentation and method `Agent.compileGuildSQL`
- All handlers now extend from a base handler
- `Agent.validateChannel` has been moved to `BaseHandler.validateChannel`
- `Agent.buildHelp({ supportServerInviteCode })` has been changed to `Agent.buildHelp({ serverCode })`
- `Agent.buildHelp({ prefixImage })` has been changed to `Agent.buildHelp({ footerImage })`
- The `buildHelp` help menu embed has been altered slightly
- `new Await({ options: { shiftCount } })` has been changed to a boolean `new Await({ options: { shouldShift } })` that causes only 1 shift
- `new Await({ options: { postMessageFunction, postReactionFunction } })` has been changed to `new Await({ options: { postEventFunctions: { message, reaction } } })`

### **Bug Fixes**
- `Agent.validateChannel` will no longer error if the channel is a DM channel
- Permissions no longer break with commands run in DMs
- The command handler no longer manipulates the content values of messages in the Eris cache
- Manipulating pages returned by the `buildHelp` method no longer alters the cache
- Fixed an issue with some replacer braces not working (especially multi-character ones) due to how the Regex was handled

### **Removed Features**
- Removed the loop function which can be done by anyone with a simple `setInterval`
- When a shard disconnects, the agent will no longer try to reconnect as Eris does that automatically
- Removed connectRetryLimit due to impracticality and the fact that it's handled by Eris

1.3.2
-
### **Important Notes**
- `Agent.addAttachment` has been changed to `Agent.attach`
- `Agent.removeAttachment` has been changed to `Agent.detach`

### **Bug Fixes**
- Fixed bug that prevented await timeouts from working properly

1.3.1
-
### **New Handling Features**
- Awaits are now supplied to their cancel functions as parameters
- Added support for gateway intents (automatically calculated and allow supplying of custom intents)

### **Important Notes**
- `Agent.getTopPermissionLevel` now returns Infinity for the owner of the guild

### **Bug Fixes**
- Fixed bug that prevented the command handler from properly checking if the reaction handler was enabled
- Fixed bug that prevented the reaction handler from properly checking if the command handler was enabled
- Fixed an issue with the help menu builder that caused a Discord error
- Fixed a bug that prevented the handlers from checking permissions properly

### **Removed Features**
- User blacklist

1.3.0
-
### **New Handling Features**
- Commands and Awaits now support delimiters longer than 1 character
- ReactionHandler now has a method for detaching interfaces from messages
- You can now supply a user ID in the options for an Await
- `CommandHandler.addAwait` is now public
- An array of awaits can now be added
- `Agent.buildHelp` now returns an object containing the embed and help menu pages
- Prefixes are no longer needed when the bot is DM'd
- Commands and react commands can now be assigned a `guildOnly` option that prevent them from being used in channels such as DMs
- Added attachments! Attachments are attached to the agent via the proper method and are supplied to commands. A good use for the attachments system would be supplying your database manager
- Changed command and handler interaction flow to make more sense. All references now go through the agent. (For example, to access a command, use `action: ({ agent }) => agent.commandHandler.getCommand('name')`)
- `Agent.buildHelp`'s speed has been dramatically increased
- Added an ALO permissions system (Authority Level Oriented)

### **Quality of Life**
- Upgraded the `Agent.buildHelp` help menu help icon (Now hosted in the repository as well)
- Many class members have been moved around and changed. Refer to docs
- Many class methods are no longer async. Refer to docs

### **Important Notes**
- `CommandResults.options.wait` has beeen changed to `CommandResults.options.awaits`
- Upgraded to Node 12
- All `simple-knex` oriented support has been dropped in light of the new attachments system
- All `dblapi.js` oriented support has been dropped in light of the new attachments system
- `new Agent({ agentOptions: { prefix } })` has been changed to `new Agent({ handlerData: { options: { prefix } } })`
- `new CommandHandler({ prefix })` has been changed to `new CommandHandler({ options: { prefix } })`
- `new Agent({ agentOptions: { maxInterfaces } })` has been changed to `new Agent({ handlerData: { options: { maxInterfaces } } })`
- The event handlers no longer support custom error code ignoring. Error code ignoring is now handled by the agent. To propose more codes to ignore, make an issue on the repository
- `Agent.buildHelp({ page })` has been changed to `Agent.buildHelp({}, page)`
- `Agent.buildHelp({ description })` has been changed to `Agent.buildHelp({ desc })`
- Blacklisting users is now done through methods instead of the constructor
- `new Agent({ agentOptions })` has been changed to `new Agent({ options })`
- `ReactCommand.restricted`'s behavior has been changed to act more like `Command.restricted`'s
- `designatedUsers` is no longer supported in the ReactCommand constructor
- `restricted` is no longer supported in the ReactInterface constructor
- `designatedUsers` for react interfaces no longer requires the `restricted` property to be true. (It's by default an array containing the ID of the bound message author)

### **Bug Fixes**
- Fixed bug where supplying a single replacer without an array would not meet the conditions for the prefix-replacer braces error
- Fixed an inconsistency between `Command.info` and `Replacer.info`

1.2.4
-
### **New Handling Features**
- Awaits are no longer passed an object to the check function. They are now directly passed the Message object
- There is a new option for Awaits called `requirePrefix` which will only trigger the await when it is prefaced with the bot prefix or mention. The Message object passed to the check function contains message content without the prefix.

### **Bug Fixes**
- Fixed a bug that slipped under the testing suite radar where the module would immediately crash on start (Yikes)

1.2.3
-
### **New Handling Features**
- You can now designate a shift count for awaits to shift the args a number of spaces to improve argument usage
- `Command.info` now includes command aliases

### **Important Notes**
- If a function is passed for `Agent.agentOptions.statusMessage`, `editStatus` is now the first parameter

### **Bug Fixes**
- The command handler will now send the length error for the invalid form body error `Embed size exceeds maximum size of 6000`
##### (This was removed previously due to me forgetting the name of this error and removing the check for keyword 'size')
- When `Agent.agentOptions.statusMessage` is a function, `editStatus` passed no longer errors

1.2.2
-
### **Important Notes**

- `initResponse` passed to await actions has been changed to `triggerResponse`

### **Bug Fixes**

- Fixed an issue with `initResponse`/`triggerResponse` for Awaits

1.2.1
-
### **Bug Fixes**

- Fixed bug where on a shard disconnect, the shard wasn't properly displayed.
- The agent will only log `Initiating Command Handler` when the command handler is actually being initiated (yikes)
- Removed a catch that caused issues

1.2.0
-
### **New Developer-Favoring Features**

- User blacklisting: *You can pass an array of user IDs to the agent to blacklist them from using bot commands*

### **New Handling Features**

- There's now a post-handle function for react commands
- You can now pass an array to `CommandResults.options.channels` to have a message send to multiple channels with the same options all applied (Interfaces, deleteAfter delays, etc.)

### **Quality of Life**

- Capitalization of command names and aliases while defining or calling no longer matters
- Command aliases will now automatically turn into an array
- Normalized handler returns to be more consistent
- When a minor error occurs sending the response such as a non-existent channel or missing permissions, the response will be an error instance with the reason in the message

### **Important Notes**

- For handler results, `results.response` has been changed to `results.responses` and is an array
- For handler results, `results.options.channel` has been changed to `results.options.channels` and is an array
- For Agent construction, `data.databaseOptions.clearEmptyRows` has been changed to `data.databaseOptions.clearDefaultRows`
- When a minor error occurs, the handler will not throw, instead, the response with be a **returned** error. Anything done with the response should check if the response is an instance of an Error
- For those of you who use `_successfulResponses`, it's been changed to `_successfulResponse` and has had the parameters reworked
- `deleteAfter` will no longer throw an error if the message is already deleted
- For react commands, the `reactInterface` parameter passed to the action representing the parent interface of a button has been changed to `parentInterface`

### **Bug Fixes**

- Added more catches for promises to reduce unhandled rejections for when they are no longer ignored by the Node runtime
- Fixed issue where `initResponse` was not being passed to await actions when they were registered by react commands

1.1.1
-
### **Base Version With**

- Automated bot functions
- Command handling
- Reaction handling
- Message awaiting