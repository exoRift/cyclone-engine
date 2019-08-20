1.1.1
-
### **Base version with**

- Automated bot functions
- Command handling
- Reaction handling
- Message awaiting

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