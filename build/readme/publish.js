const env = require('jsdoc/env')
const fs = require('jsdoc/fs')
const helper = require('jsdoc/util/templateHelper')
const path = require('jsdoc/path')

const unpack = require('./modules/unpack.js')
const compileTable = require('./modules/compileTable.js')

const keywordRegex = /^{docs\.(.+?)(?:: (.+?))?}$/gm

const templateData = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8')

const outdir = path.normalize(env.opts.destination)

exports.publish = (taffyData) => {
  const template = helper.prune(taffyData)

  const content = templateData.replace(keywordRegex, (match, dir, params = '') => {
    const [
      kind,
      name
    ] = dir.split('.')
    const [
      tableNameColor,
      tableDescColor = '#a0a0a0'
    ] = params.split(', ')

    const doclet = template({ kind, name }).first()

    const columnNames = [
      'Parameter',
      'Type',
      'Description',
      'Default'
    ]

    const columns = [
      'name',
      'type',
      'description',
      'defaultvalue'
    ]

    const rows = unpack(columns, doclet)

    const table = compileTable(doclet, columnNames, rows, {
      tableNameColor,
      descColor: tableDescColor
    })

    return table
  })

  const outpath = path.join(outdir, 'README.md')

  return fs.writeFileSync(outpath, content)
}
