const fs = require('fs').promises

const findPaths = require('./pathfinder.js')
const interpret = require('./jsdinterpreter.js')
const formatReadme = require('./jsontotable')

findPaths('./', ['./build']).then(async (directories) => {
  fs.readFile('./build/READMEtemplate.md', 'utf8').then((file) => {
    interpret(directories).then((r) => fs.writeFile('./README.md', formatReadme(file, r)))
  })
})
