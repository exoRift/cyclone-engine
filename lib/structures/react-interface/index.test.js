import test from 'ava'
import ReactInterface from '.'
import ReactCommand from '../react-command'

test('invalidButtonType', (t) => {
  let error

  try {
    error = new ReactInterface({
      buttons: 1
    })
  } catch (err) {
    error = err
  }

  t.deepEqual(error, TypeError('Supplied button not ReactCommand instance:\n1'))
})

test('buttonPropertyInheritence', (t) => {
  const reactInterface = new ReactInterface({
    buttons: new ReactCommand({
      emoji: '🍕'
    }),
    options: {
      restricted: true,
      designatedUsers: '1',
      deleteAfterUse: true,
      removeReaction: true
    }
  })

  t.true(reactInterface.buttons.get('🍕').restricted, 'Restricted')
  t.deepEqual(reactInterface.buttons.get('🍕').designatedUsers, ['1'], 'Designated users')
  t.true(reactInterface.buttons.get('🍕').removeReaction, 'Remove reaction')

  const designatedUsersArrayReactInterface = new ReactInterface({
    buttons: new ReactCommand({
      emoji: '🍕'
    }),
    options: {
      designatedUsers: ['1', '2']
    }
  })

  t.deepEqual(designatedUsersArrayReactInterface.designatedUsers, ['1', '2'], 'Designated users when an array is passed (interface)')
  t.deepEqual(designatedUsersArrayReactInterface.buttons.get('🍕').designatedUsers, ['1', '2'], 'Designated users when an array is passed (button)')
})
