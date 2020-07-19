// A `Matcher` wraps a simple match generator function in a more complex object
// with numerous useful methods

const simple = require('./simple')

// This symbol lets us skip a level and get to the Matcher's inner
const MATCHER_INNER = Symbol('inner')

// If `inner` is a string, promote it to a `fixed` `Matcher` for that string.
const promote = inner =>
  typeof inner === 'string' ? Matcher.fixed(inner) : inner

/**
  Construct a Matcher function from a simple match generator function. You
  should generally not call this constructor directly.
*/
const Matcher = inner => {
  if (!inner) {
    throw Error()
  }
  if (typeof inner === 'function' && MATCHER_INNER in inner) {
    throw Error('Can\'t make a Matcher from a Matcher')
  }

  // Can't just write `inner` here because we need
  // to add properties to `outer` but we don't want to modify
  // `inner`.
  const matcher = (string, i) => inner(string, i)

  return Object.assign(
    matcher,

    // Matcher object members
    {
      [MATCHER_INNER]: inner,
      or: other => Matcher.or([matcher, other]),
      seq: (other, separator) => Matcher.seq([matcher, other], separator),
      star: () => Matcher.star(matcher),
      plus: separator => Matcher.plus(matcher, separator),
      maybe: () => Matcher.maybe(matcher),
      map: f => Matcher.map(matcher, f),
      filter: f => Matcher.filter(matcher, f)
    }
  )
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
    Matcher(simple.or(matchers.map(matcher => promote(matcher)[MATCHER_INNER]))),

  seq: (matchers, separator) =>
    Matcher(simple.seq(
      matchers.map(matcher => promote(matcher)[MATCHER_INNER]),
      separator === undefined ? undefined : promote(separator)[MATCHER_INNER]
    )),

  times: (matcher, min, max, separator) =>
    Matcher(simple.times(
      promote(matcher)[MATCHER_INNER],
      min,
      max,
      separator === undefined ? undefined : promote(separator)[MATCHER_INNER]
    )),

  star: matcher =>
    Matcher(simple.star(promote(matcher)[MATCHER_INNER])),

  plus: (matcher, separator) =>
    Matcher(simple.plus(
      promote(matcher)[MATCHER_INNER],
      separator === undefined ? undefined : promote(separator)[MATCHER_INNER]
    )),

  maybe: matcher =>
    Matcher(simple.maybe(promote(matcher)[MATCHER_INNER])),

  resolve: open => {
    const closed = Object.fromEntries(
      Object.entries(
        open(nonterminal =>
          Matcher((string, i) =>
            closed[nonterminal](string, i)
          )
        )
      ).map(([nonterminal, matcher]) =>
        [nonterminal, promote(matcher)]
      )
    )
    return closed
  },

  map: (inner, f) =>
    Matcher(simple.map(promote(inner)[MATCHER_INNER], f)),

  filter: (inner, f) =>
    Matcher(simple.filter(promote(inner)[MATCHER_INNER], f))
})

module.exports = Matcher
