import { Agent } from 'cyclone-engine'
import { Client } from 'oceanic.js'

if (!process.env.TOKEN) throw Error('No token supplied')

const agent = new Agent({
  Client,
  token: process.env.TOKEN
})

void agent.registerEffectsFromDir(import.meta.dir + '/effects')

await agent.connect()
