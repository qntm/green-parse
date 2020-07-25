// A `Matcher` wraps a simple match generator function in a more complex object
// with numerous useful methods

const simple = require('../simple')

// If `inner` is a string, promote it to a `fixed` `Matcher` for that string.
// If it's a regular expression, promote it to a `regex` `Matcher`.
const promote = inner => typeof inner === 'string' ? Matcher.fixed(inner)
  : Object.prototype.toString.call(inner) === '[object RegExp]' ? Matcher.regex(inner)
    : inner

/**
  Construct a Matcher function from a simple match generator function. Users
  should generally not call this constructor directly.
*/
const Matcher = inner => {
  /* istanbul ignore next */
  if ('match' in inner) {
    throw Error('Can\'t make a Matcher from a Matcher')
  }

  const matcher = {
    match: inner,
    parse: simple.parser(inner),
    parse1: simple.parse1(inner)
  }

  Object.assign(matcher, {
    or: other => Matcher.or([matcher, other]),
    seq: (other, separator) => Matcher.seq([matcher, other], separator),
    times: (min, max, separator) => Matcher.times(matcher, min, max, separator),
    star: separator => Matcher.star(matcher, separator),
    plus: separator => Matcher.plus(matcher, separator),
    maybe: () => Matcher.maybe(matcher),
    map: f => Matcher.map(matcher, f),
    filter: f => Matcher.filter(matcher, f)
  })

  return matcher
}

// Matcher class members. Extracting and rewrapping functions reduces stack
// depth
Object.assign(Matcher, {
  NOTHING: Matcher(simple.NOTHING),
  EMPTY: Matcher(simple.EMPTY),
  CHR: Matcher(simple.CHR),
  UNICODE: Matcher(simple.UNICODE),

  fixed: needle =>
    Matcher(simple.fixed(needle)),

  or: matchers =>
    Matcher(simple.or(matchers.map(matcher => promote(matcher).match))),

  seq: (matchers, separator) =>
    Matcher(simple.seq(
      matchers.map(matcher => promote(matcher).match),
      separator === undefined ? undefined : promote(separator).match
    )),

  times: (matcher, min, max, separator) =>
    Matcher(simple.times(
      promote(matcher).match,
      min,
      max,
      separator === undefined ? undefined : promote(separator).match
    )),

  star: (matcher, separator) =>
    Matcher(simple.star(
      promote(matcher).match,
      separator === undefined ? undefined : promote(separator).match
    )),

  plus: (matcher, separator) =>
    Matcher(simple.plus(
      promote(matcher).match,
      separator === undefined ? undefined : promote(separator).match
    )),

  maybe: matcher =>
    Matcher(simple.maybe(promote(matcher).match)),

  resolve: open => {
    const closed = Object.fromEntries(
      Object.entries(
        open(nonterminal =>
          Matcher((string, i) =>
            closed[nonterminal].match(string, i)
          )
        )
      ).map(([nonterminal, matcher]) =>
        [nonterminal, promote(matcher)]
      )
    )
    return closed
  },

  map: (matcher, f) =>
    Matcher(simple.map(promote(matcher).match, f)),

  filter: (matcher, f) =>
    Matcher(simple.filter(promote(matcher).match, f)),

  regex: regExp =>
    Matcher(simple.regex(regExp))
})

module.exports = Matcher
