// A `Matcher` wraps a simple match generator function in a more complex object
// with numerous useful methods

import * as simple from '../simple/index.js'

const promote = value => typeof value === 'string'
  ? fixed(value)
  : Object.prototype.toString.call(value) === '[object RegExp]'
    ? regex(value)
    : value

/**
  Construct a Matcher function from a simple match generator function. Users
  should generally not call this constructor directly.
*/
class Matcher {
  constructor (inner) {
    this.match = inner
  }

  * parse (string) {
    for (const value of this.match(string, 0)) {
      if (value.j === string.length) {
        yield value.match
      }
    }
  }

  parse1 (string) {
    for (const value of this.match(string, 0)) {
      if (value.j !== string.length) {
        continue
      }
      return value.match
    }
    throw Error('Parsing failed')
  }

  or (other) {
    return or([this, other])
  }

  seq (other, separator = EMPTY) {
    return seq([this, other], separator)
  }

  times (min, max, separator = EMPTY) {
    return new Matcher(simple.times(this.match, min, max, promote(separator).match))
  }

  star (separator) {
    return this.times(0, Infinity, separator)
  }

  plus (separator) {
    return this.times(1, Infinity, separator)
  }

  maybe () {
    return this.times(0, 1)
  }

  map (f) {
    return new Matcher(simple.map(this.match, f))
  }

  filter (f) {
    return new Matcher(simple.filter(this.match, f))
  }
}

export const NOTHING = new Matcher(simple.NOTHING)
export const EMPTY = new Matcher(simple.EMPTY)
export const CHR = new Matcher(simple.CHR)
export const UNICODE = new Matcher(simple.UNICODE)

export const fixed = needle =>
  new Matcher(simple.fixed(needle))

export const regex = regExp =>
  new Matcher(simple.regex(regExp))

export const or = matchers =>
  new Matcher(simple.or(matchers.map(matcher => promote(matcher).match)))

export const seq = (matchers, separator = EMPTY) =>
  new Matcher(simple.seq(matchers.map(matcher => promote(matcher).match), promote(separator).match))

export const resolve = open => {
  const closed = open(nonterminal => new Matcher((string, i) => closed[nonterminal].match(string, i)))

  Object.keys(closed).forEach(nonterminal => {
    closed[nonterminal] = promote(closed[nonterminal])
  })

  return closed
}
