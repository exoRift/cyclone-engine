import test from 'ava'
import Agent from '.'
import Command from '../modules/command'
import Await from '../modules/await'
import Replacer from '../modules/replacer'
import PDiscord from '../pdc.js'
import QueryBuilder from 'simple-knex'

require('dotenv').config()

const {
  DATABASE_URL
} = process.env

const data = {
  commands: [
    new Command({
      name: 'command1',
      desc: 'A test command',
      action: () => '1'
    })
  ],
  replacers: [
    new Replacer({
      name: 'replacer1',
      desc: 'A test replacer',
      action: () => 'r1'
    })
  ]
}

function delay (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

// const agent = new Agent(PDiscord, '123TOKEN', data, {
//   connectionURL: DATABASE_URL,
//   client: 'pg',
//   tables: [

//   ],
//   clearEmptyRows: [
    
//   ]
// }, {
//   dblToken: '123'
// })

test.todo('No database')

test.todo('Database')

test.todo('Initial tables')

test.todo('Table cleanup')

test.todo('Connect retry limit')

test.todo('No DBL')

test.todo('DBL')

test.todo('Interval check')

test.todo('Message event')

test.todo('lastMessage')

test.todo('Error recieved')

test.todo('Disconnection')
