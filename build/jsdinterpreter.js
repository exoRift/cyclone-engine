const { readFile } = require('fs').promises
const parseDoc = require('./parsedoc.js')

/**
 * Convert JSDocs from a file into JSON.
 * @function
 * @param    {String[]|String} dirs The directory or directories of the file(s) to convert.
 */
function interpret (dirs = []) {
  if (typeof dir === 'string') dirs = [dirs]

  const promises = []

  const types = {
    classes: {},
    typedefs: {}
  }

  for (const dir of dirs) {
    promises.push(readFile(dir, 'utf8').then((file) => {
      const fileLines = file.split('\r\n').map((l) => l.trim())
      const docs = []
      let inDoc

      // TURN THIS INTO 1 LOOP
      for (let i = 0; i < fileLines.length; i++) {
        let index
        let content
        if (fileLines[i].startsWith('/**')) {
          if (!fileLines[i].endsWith('*/')) inDoc = true
          content = fileLines[i] === '/**' ? [] : [fileLines[i].replace(/(\/\*\* ?| ?\*\/)/g, '')]
        } else if (fileLines[i].endsWith('*/')) inDoc = false
        else if (inDoc) {
          index = docs.length - 1
          content = fileLines[i].replace(/^\* /, '')
        } else if (fileLines[i] !== '\r\n') content = fileLines[i]

        if (content) {
          if (index !== undefined) docs[index].push(content)
          else docs.push(content)
        }
      }

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i]
        if (!Array.isArray(doc)) continue
        const {
          desc
        } = parseDoc(doc)
        const nextLine = docs[i + 1]
        const prevLine = docs[i - 1]
        if (nextLine.startsWith('class')) {
          types.classes[nextLine.split(' ')[1]] = {
            desc
          }
          console.log(types.classes)
        }
      }
    }))
  }

  return Promise.all(promises).then(() => types)
}

module.exports = interpret
