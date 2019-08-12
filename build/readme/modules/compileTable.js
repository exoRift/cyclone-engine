/**
 * Compile a doclet into a table.
 * @param   {Doclet}   doclet                   The doclet.
 * @param   {String[]} columns                  The column names.
 * @param   {String[]} rows                     The row values.
 * @param   {Object}   options                  Options for the table.
 * @prop    {String}   [options.tableNameColor] The color of the table name.
 * @prop    {String}   [options.tableDescColor] The color of the table description.
 * @returns {String}                            The resulting table.
 */
function compileTable (doclet, columns, rows, options) {
  const {
    tableNameColor,
    descColor
  } = options

  let columnText = ''
  let columnUnderline = ''

  for (const column of columns) {
    const discrim = column === columns[0] ? '' : '|'

    columnText += discrim + column
    columnUnderline += discrim + '-'.repeat(column.length)
  }

  const table =
    `<font size='+2'${tableNameColor ? ` color='${tableNameColor}'` : ''}>${doclet.name}</font>\n\n<font size='+1' color='${descColor}'>${doclet.classdesc}</font>\n\n---\n${columnText}\n${columnUnderline}\n${rows}`

  return table
}

module.exports = compileTable
