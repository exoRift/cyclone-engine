1.3.0
-
### **New handling features**
- Commands and Awaits now support delimiters longer than 1 character
- ReactionHandler now has a method for detaching interfaces from messages
- You can now supply a user ID in the options for an Await
- `CommandHandler.addAwait` is now public
- An array of awaits can now be added

### **Important notes**
- `CommandResults.options.wait` has beeen changed to `CommandResults.options.awaits`
- Upgraded to Node 12
- All `simple-knex` oriented support has been dropped in light of the new attachments system
- All `dblapi.js` oriented support has been dropped in light of the new attachments system
- Upgraded the default help menu help icon (Now hosted in the repository)
- `new Agent({ agentOptions: { prefix } })` has been changed to `new Agent({ handlerData: { options: { prefix } } })`
- `new CommandHandler({ prefix })` has been changed to `new CommandHandler({ options: { prefix } })`
- `new Agent({ agentOptions: { maxInterfaces } })` has been changed to `new Agent({ handlerData: { options: { maxInterfaces } } })`
- Many class members have been moved around and changed. Refer to docs
- Many class methods are no longer async. Refer to docs

1.2.4
-
### **New handling features**
- Awaits are no longer passed an object to the check function. They are now directly passed the Message object
- There is a new option for Awaits called `requirePrefix` which will only trigger the await when it is prefaced with the bot prefix or mention. The Message object passed to the check function contains message content without the prefix.

### **Bug fixes**
- Fixed a bug that slipped under the testing suite radar where the module would immediately crash on start (Yikes)

1.2.3
-
### **New handling features**
- You can now designate a shift count for awaits to shift the args a number of spaces to improve argument usage
- `Command.info` now includes command aliases

### **Important notes**
- If a function is passed for `Agent.agentOptions.statusMessage`, `editStatus` is now the first parameter

### **Bug fixes**
- The command handler will now send the length error for the invalid form body error `Embed size exceeds maximum size of 6000`
##### (This was removed previously due to me forgetting the name of this error and removing the check for keyword 'size')
- When `Agent.agentOptions.statusMessage` is a function, `editStatus` passed no longer errors

1.2.2
-
### **Important notes**

- `initResponse` passed to await actions has been changed to `triggerResponse`

### **Bug fixes**

- Fixed an issue with `initResponse`/`triggerResponse` for Awaits

1.2.1
-
### **Bug Fixes**

- Fixed bug where on a shard disconnect, the shard wasn't properly displayed.
- The agent will only log `Initiating Command Handler` when the command handler is actually being initiated (yikes)
- Removed a catch that caused issues

1.2.0
-
### **New developer-favoring features**

- User blacklisting: *You can pass an array of user IDs to the agent to blacklist them from using bot commands*

### **New handling features**

- There's now a post-handle function for react commands
- You can now pass an array to `CommandResults.options.channels` to have a message send to multiple channels with the same options all applied (Interfaces, deleteAfter delays, etc.)

### **Quality of life**

- Capitalization of command names and aliases while defining or calling no longer matters
- Command aliases will now automatically turn into an array
- Normalized handler returns to be more consistent
- When a minor error occurs sending the response such as a non-existent channel or missing permissions, the response will be an error instance with the reason in the message

### **Important notes**

- For handler results, `results.response` has been changed to `results.responses` and is an array
- For handler results, `results.options.channel` has been changed to `results.options.channels` and is an array
- For Agent construction, `data.databaseOptions.clearEmptyRows` has been changed to `data.databaseOptions.clearDefaultRows`
- When a minor error occurs, the handler will not throw, instead, the response with be a **returned** error. Anything done with the response should check if the response is an instance of an Error
- For those of you who use `_successfulResponses`, it's been changed to `_successfulResponse` and has had the parameters reworked
- `deleteAfter` will no longer throw an error if the message is already deleted
- For react commands, the `reactInterface` parameter passed to the action representing the parent interface of a button has been changed to `parentInterface`

### **Bug fixes**

- Added more catches for promises to reduce unhandled rejections for when they are no longer ignored by the Node runtime
- Fixed issue where `initResponse` was not being passed to await actions when they were registered by react commands

1.1.1
-
### **Base version with**

- Automated bot functions
- Command handling
- Reaction handling
- Message awaiting