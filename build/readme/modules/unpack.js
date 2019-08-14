const dotRegex = /\./g
const barRegex = /\|/g
const typeArrowRegex = /([<|>])/g
const typeDetailRegex = /\.</g

/**
 * Format the properties of a doclet into a table column.
 * @generator
 * @param     {String[]} columns The columns of the table.
 * @param     {Doclet}   doclet  The doclet to format.
 * @returns   {String}           The table column values.
 */
function format (columns, doclet) {
  const rows = doclet.properties

  for (const param of doclet.params) {
    const index = rows.findIndex((r) => r.name.startsWith(param.name + '.')) - 1

    rows.splice(index < 0 ? 0 : index, 0, param)
  }

  const results = rows.reduce((a, r) => {
    return a + (a ? '\n' : '') + columns.reduce((cA, c) => {
      let content

      switch (c) {
        case 'name': content = (r.optional ? `[${r[c]}]` : r[c]).replace(dotRegex, '<span>.</span>'); break
        case 'type': content = r[c].names.reduce((tA, t) => tA + (tA ? '|' : '') + t, '').replace(typeDetailRegex, '<').replace(typeArrowRegex, (match, capture) => `<span>${capture}</span>`); break
        case 'defaultvalue': content = r[c] === undefined ? '*' : `<font color='#f5c842'>${String(r[c])}</font>`; break
        default: content = r[c]; break
      }

      return cA + (cA ? '|' : '') + String(content || '<font color=\'red\'>X</font>').replace(barRegex, '\\|')
    }, '')
  }, '')

  return results
}

module.exports = format
