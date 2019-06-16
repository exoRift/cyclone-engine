/**
 * Unpack properties of parameters into one array.
 * @param   {Object[]} [params=[]] The original array containing the parameters.
 * @returns {Object[]}             The new parameter array.
 */
function unpack (params = []) {
  for (let i = 0; i < params.length; i++) {
    if (params[i].props && params[i].props.length) params.splice(i + 1, 0, ...params[i].props)
  }

  return params
}

module.exports = unpack
