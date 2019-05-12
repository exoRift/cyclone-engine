/**
 * Parse JSDocs into data.
 * @param {String[]} docs An array of the lines of the docs
 */
function parseDoc (docs) {
  const data = {}

  for (const doc of docs) {
    if (!doc.startsWith('@')) data.desc = doc
  }

  return data
}

module.exports = parseDoc
