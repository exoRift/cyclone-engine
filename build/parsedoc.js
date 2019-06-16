const splitRegex = /({.+?}|[^ ]+)/g
const nameRegex = /(\[|\]|=.+)/g
const typeRegex = /({|})/g
const defaultRegex = /(\[|\])/g

/**
 * Parse JSDocs into data.
 * @param {String[]} docs An array of the lines of the docs
 */
function parseDoc (docs) {
  const data = {
    params: []
  }

  for (const doc of docs) {
    if (!doc.startsWith('@')) {
      data.desc = doc
      continue
    }

    const split = doc.substring(1).match(splitRegex)

    let name
    let type
    switch (split[0]) {
      case 'private': data.isPrivate = true; break
      case 'function': data.func = true; break
      case 'typedef':
        data.typedef = {
          name: split[2],
          type: split[1].replace(typeRegex, '')
        }
        break
      case 'class':
      case 'constructor': data.construct = true; break
      case 'parameter':
      case 'param':
        name = split[2].replace(nameRegex, '')
        type = split[1].replace(typeRegex, '')
        data.params.push({
          name,
          type,
          desc: split.slice(3).join(' '),
          optional: split[2].startsWith('[') && split[2].endsWith(']'),
          default: split[2].replace(defaultRegex, '').split('=')[1],
          props: []
        })
        break
      case 'property':
      case 'prop':
        name = split[2].replace(nameRegex, '')
        type = split[1].replace(typeRegex, '')

        const propTree = name.split('.')
        propTree.pop()
        let currProp = data.params
        for (const prop of propTree) currProp = currProp.find((p) => p.name.endsWith(prop)).props

        currProp.push({
          name,
          type,
          desc: split.slice(3).join(' '),
          optional: split[2].startsWith('[') && split[2].endsWith(']'),
          default: split[2].replace(defaultRegex, '').split('=')[1],
          props: []
        })
        break
      case 'type': data.type = split[1].replace(typeRegex, ''); break
      case 'return':
      case 'returns':
        type = split[1].replace(typeRegex, '')

        data.returns = {
          type,
          desc: split.slice(2).join(' ')
        }
        break
    }
  }

  return data
}

module.exports = parseDoc
