const fs = require('fs').promises

const findPaths = require('./pathfinder.js')
const interpret = require('./jsdinterpreter.js')
const formatReadme = require('./jsontotable')

findPaths('./', ['./build']).then(async (directories) => {
  fs.readFile('./build/READMEtemplate.md').then((file) => {
    interpret(directories)
    // fs.writeFile('./README.md', formatReadme(file, interpret(directories)))
  })
})
