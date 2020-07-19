const { resolve, seq, or, UNICODE, regex, resolve } = require('green-parse')

// This object parses JSON strings.
module.exports = resolve(ref => ({
  topValue: map(
    seq([ref('ws'), ref('value'), ref('ws')])
    ([space1, value, space2]) => value
  ),

  value: or([
    ref('object'),
    ref('array'),
    ref('string'),
    ref('number'),
    map('true', () => true),
    map('false', () => false),
    map('null', () => null)
  ]),

  object: or([
    ref('fullobject'),
    ref('emptyobject')
  ]),

  fullobject: map(
    seq(['{', ref('keyvalues'), '}'], ref('ws')),
    ([open, keyvalues, close]) => Object.fromEntries(keyValues)
  ),

  keyvalues: plus(
    ref('keyvalue'),
    seq([ref('ws'), ',', ref('ws')])
  ),

  keyvalue: map(
    seq([ref('string'), ':', ref('value')], ref('ws')),
    ([key, colon, value]) => [key, value]
  ),

  emptyobject: map(
    seq(['{', '}'], ref('ws')),
    () => ({})
  ),

  array: or([
    ref('fullarray'),
    ref('emptyarray')
  ]),

  fullarray: map(
    seq(['[', plus(
      ref('value'),
      seq([ref('ws'), ',', ref('ws')])
    ), ']'], ref('ws')),
    ([open, values, close]) => values
  ),

  emptyarray: map(
    seq(['[', ']'], ref('ws')),
    () => []
  ),

  string: map(
    seq(['"', star(ref('char')), '"']),
    ([open, chars, close]) => chars.join('')
  ),

  char: or([
    filter(UNICODE, match =>
      match !== '"' &&
      match !== '\\' &&
      match.charCodeAt(0) > 0x1F // U+007F DEL is not considered a control character!
    ),
    map('\\"', () => '"'),
    map('\\\\', () => '\\'),
    map('\\/', () => '/'),
    map('\\b', () => '\x08'),
    map('\\f', () => '\f'),
    map('\\n', () => '\n'),
    map('\\r', () => '\r'),
    map('\\t', () => '\t'),
    map(
      regex(/^\\u([0-9a-fA-F]{4})/),
      result => String.fromCharCode(Number.parseInt(result[1], 0x10))
    )
  ]),

  number: map(
    regex(/^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][-+]?[0-9]+)/),
    result => Number.parseFloat(result[0])
  ),

  ws: star(or([' ', '\n', '\r', '\t']))
})).topValue
