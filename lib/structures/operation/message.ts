import * as Oceanic from 'oceanic.js'

import {
  Base,
  Origins
} from './base'

export interface MessageOperationData {
  /** The message content */
  content?: string
  /** The message embeds */
  embeds?: Oceanic.EmbedOptions[]
  /** The message files */
  files?: Oceanic.File[]
  /** The message attachments (files, images) */
  attachments?: Oceanic.MessageAttachment[]
  /** The ID of the message you're replying to if any */
  reference?: string
  /** Additional options for the message */
  options?: {
    /** Should the author of the referenced message be pinged? */
    pingReference?: boolean
    /** Who is this message allowed to mention? (this is auto-sanitization) */
    allowedMentions?: Omit<Oceanic.AllowedMentions, 'repliedUser'>
    /** A list of sticker IDs to attach to the message */
    stickers?: string[]
    /** Will this message be read aloud? */
    tts?: boolean
    /** The amount of milliseconds to wait before deleting the message or not at all (do not set if message is ephemeral) */
    deleteAfter?: number
    /** Message flags [Discord Docs]{@link https://discord.com/developers/docs/resources/channel#message-object-message-flags} */
    flags?: number
  }
}

export class Message extends Base<MessageOperationData, 'channel'> {
  readonly type = 'message'
  readonly requisites: 'channel'[] = ['channel']

  async execute (data: Pick<Origins, 'channel'>): Promise<Partial<Origins>> {
    return data.channel.createMessage({ // todo: test for permission to send in channel and make sure channel valid
      content: this.data.content,
      embeds: this.data.embeds,
      files: this.data.files,
      attachments: this.data.attachments,
      stickerIDs: this.data.options?.stickers,
      messageReference: {
        messageID: this.data.reference
      },
      allowedMentions: this.data.options?.allowedMentions,
      flags: this.data.options?.flags,
      tts: this.data.options?.tts
    })
      .then((msg) => { // todo: deleteAfter
        return {
          channel: msg.channel,
          message: msg
        }
      })
  }
}
