const { readdir } = require('fs').promises

/**
 * Return all JS files in the project.
 * @param   {String}          [startPath='./'] The starting path.
 * @param   {String[]|String} exclude          The directories to exclude from being returned or searched
 * @returns {String[]}                         An array of all JS file directories.
 */
function findPaths (startPath = './', exclude = []) {
  if (typeof exclude === 'string') exclude = [exclude]
  exclude.push('./LICENSE', './node_modules', './coverage', './test')
  return readdir(startPath, 'utf8').then(async (paths) => {
    paths = paths.filter((p) => !exclude.includes(startPath + p) && ((p.endsWith('.js') && !p.endsWith('.test.js')) || !p.includes('.')))
    const resultPaths = []

    for (const path of paths) {
      if (path.endsWith('.js')) resultPaths.push(startPath + path)
      else resultPaths.push(...await findPaths(startPath + path + '/', exclude))
    }

    return resultPaths
  })
}

module.exports = findPaths
