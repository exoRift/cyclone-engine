const { readFile } = require('fs').promises
const parseDoc = require('./parsedoc.js')

const paramRegex = /^(async)? ?(function|get|set)?(?!constructor) ?(.+?) ?\(.*\)/s
const openScopeRegex = /\{/g
const closeScopeRegex = /\}/g

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
    typedefs: {},
    functions: {}
  }

  for (const dir of dirs) {
    promises.push(readFile(dir, 'utf8').then((file) => {
      const fileLines = file.split('\r\n').map((l) => l.trim())
      const docs = []
      let inDoc

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
          construct,
          func,
          isPrivate,
          typedef,
          desc,
          type,
          params,
          returns
        } = parseDoc(doc)
        const nextLine = typeof docs[i + 1] === 'string' ? docs[i + 1] : ''
        const prevLine = typeof docs[i - 1] === 'string' ? docs[i - 1] : ''

        const funcSplit = nextLine.match(paramRegex)

        if (typedef) { // Type definition
          types.typedefs[typedef.name] = {
            type: typedef.type,
            desc,
            params
          }
        } else if (func || funcSplit) { // Function or Method
          const [
            ,
            asyncSlot,
            typeSlot,
            name
          ] = funcSplit

          let inClass

          const type = typeSlot === 'get' ? 'getter' : typeSlot === 'set' ? 'setter' : 'classic'

          let scopeLevel = 0
          for (let j = i; j >= 0; j--) {
            if (typeof docs[j] === 'string') {
              while (openScopeRegex.exec(docs[j]) !== null) scopeLevel++
              while (closeScopeRegex.exec(docs[j]) !== null) scopeLevel--
              if (docs[j].startsWith('class') && scopeLevel === 1) inClass = docs[j].split(' ')[1]
            }
          }

          if (inClass) {
            types.classes[inClass].methods.push({
              name,
              desc,
              type,
              async: asyncSlot === 'async',
              params,
              private: isPrivate,
              returns
            })
          } else {
            types.functions[name] = {
              desc,
              type,
              async: asyncSlot === 'async',
              params,
              private: isPrivate,
              returns
            }
          }
        } else if (nextLine.startsWith('class')) { // Class
          types.classes[nextLine.split(' ')[1]] = {
            desc,
            props: [],
            methods: []
          }
        } else if (construct || nextLine.startsWith('constructor(')) { // Constructor params
          const className = prevLine.split(' ')[1]

          if (!types.classes[className]) {
            types.classes[className] = {
              props: [],
              methods: []
            }
          }

          types.classes[className].construct = {
            desc,
            params
          }
        } else if (nextLine.startsWith('this.') && nextLine.split(' = ').length === 2) { // Constructor Prop
          for (let j = i; j >= 0; j--) {
            if (typeof docs[j] === 'string' && docs[j].startsWith('class')) {
              types.classes[docs[j].split(' ')[1]].props.push({
                name: nextLine.split(' = ')[0].replace('this.', ''),
                desc,
                type,
                private: isPrivate
              })
            }
          }
        }
      }
    }))
  }

  return Promise.all(promises).then(() => types)
}

module.exports = interpret
