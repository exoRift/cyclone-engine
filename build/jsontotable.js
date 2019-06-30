const referenceRegex = /{docs\.(.+?): (.+?)}/g
const barRegex = /\|/g
const dotRegex = /\./g
const unpack = require('./unpack.js')

/**
 * Replace references in a README with tables containing relevant data.
 * @param   {String} readme The content of the README file.
 * @param   {Object} types  The data from the JSDocs.
 * @returns {String}        The updated README.
 */
function formatReadme (readme, types) {
  return readme.replace(referenceRegex, (match, category, params) => {
    const [
      name,
      nameColor,
      descColor = '#a0a0a0'
    ] = params.split(' ')

    const data = {}

    switch (category) {
      case 'class': // UNFINISHED
        data.columnNames = ['Method', 'Description']
        data.columns = ['methods', 'desc']
        data.rows = types.classes[name].methods
        data.desc = types.classes[name].desc
        break
      case 'constructors':
        data.columnNames = ['Parameter', 'Type', 'Description', 'Default']
        data.columns = ['name', 'type', 'desc', 'default']
        data.rows = types.classes[name].construct.params
        data.desc = types.classes[name].desc
        break
      case 'typedefs':
        data.columnNames = ['Parameter', 'Type', 'Description', 'Default']
        data.columns = ['name', 'type', 'desc', 'default']
        data.rows = types.typedefs[name].params
        data.desc = types.typedefs[name].desc
        break
      case 'functions': // UNFINISHED

        break
    }

    let columns = ''
    let columnUnderline = ''

    for (const column of data.columnNames) {
      const discrim = data.columnNames[0] === column ? '' : '|'
      columns += discrim + column
      columnUnderline += discrim + '-'.repeat(column.length)
    }

    data.rows = unpack(data.rows)

    const result = data.rows.reduce((accum, curr, index) => {
      const rowColumns = data.columns.reduce((colAccum, colCurr, colIndex) => {
        if (colCurr === 'name') curr[colCurr] = curr[colCurr].replace(dotRegex, '<span>.</span>')
        return `${colAccum}${!colIndex ? '' : '|'}${curr[colCurr] ? curr[colCurr].replace(barRegex, '\\|') : '<font color=\'red\'>X</font>'}`
      }, '')
      const string = `${accum}${!index ? '' : '\n'}${rowColumns}`

      return string
    }, `<font size='+2'${nameColor ? ` color='${nameColor}'` : ''}>${name}</font>\n\n<font size='+1' color='${descColor}'>${data.desc}</font>\n\n---\n${columns}\n${columnUnderline}\n`)

    return result
  })
}

module.exports = formatReadme
