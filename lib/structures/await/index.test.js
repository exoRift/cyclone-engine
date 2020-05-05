import test from 'ava'
import sinon from 'sinon'
import Await from '.'

function delay (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

test('noSuppliedOptions', (t) => {
  function action () {
    return '1'
  }
  const wait = new Await({
    action
  })

  t.deepEqual(wait.action, action, 'Action')
  t.is(wait.options.timeout, 15000, 'Timeout')
  t.is(wait.options.check(), true, 'Check')
})

test('channelSupplied', (t) => {
  const wait = new Await({
    options: {
      channel: '1'
    }
  })

  t.is(wait.options.channel, '1')
})

test('prematurelyClearingOrRefreshing', (t) => {
  const wait = new Await({})

  t.throws(() => wait.clear(), Error, 'You have not started the timer yet!', 'Clearing')

  t.throws(() => wait.refresh(), Error, 'You have not started the timer yet!', 'Refreshing')
})

test('cancelFunction', async (t) => {
  const awaitMap = new Map()

  const spy = sinon.spy()

  const id = '00'

  awaitMap.set(id, new Await({
    options: {
      timeout: 100,
      onCancelFunction: spy
    }
  }))

  await awaitMap.get(id).startTimer({ id, awaitMap })

  await delay(150)

  t.true(spy.calledOnce)
})
