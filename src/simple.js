// Simple match generators
// It is assumed that `i` is from 0 to `string.length` inclusive.
// Functions operating on existing simple match generator functions are all
// capable of promoting a single string to a simple match generator function.

const NOTHING = function* (string, i) {}

const CHR = function* (string, i) {
  if (i < string.length) {
    yield {
      j: i + 1,
      match: string.substr(i, 1)
    }
  }
}

const UNICODE = function* (string, i) {
  if (i < string.length) {
    const first = string.charAt(i)
    if ('\uD800' <= first && first <= '\uDBFF') {
      if (i + 1 < string.length) {
        const second = string.charAt(i + 1)
        if ('\uDC00' <= second && second < '\uDFFF') {
          yield {
            j: i + 1 + 1,
            match: first + second
          }
        } // else bad UTF-16
      }
    } else {
      // BMP
      yield {
        j: i + 1,
        match: first
      }
    }
  }
}

const fixed = needle => function* (string, i) {
  if (string.substr(i, needle.length) === needle) {
    yield {
      j: i + needle.length,
      match: needle
    }
  }
}

const EMPTY = fixed('')

// If `inner` is a string, promote it to a `fixed` simple match generator for
// that string.
const promote = inner =>
  typeof inner === 'string' ? fixed(inner) : inner

/**
  Returns all the results from the first matcher and then all the results from
  the next matcher and so on
*/
const or = inners => {
  inners = inners.map(promote)
  return function* (string, i) {
    for (const inner of inners) {
      yield* inner(string, i)
    }
  }
}

const seq = (inners, separator) => {
  if (separator !== undefined && inners.length < 1) {
    throw Error('Not well-defined less than 1 inner')
  }
  separator = separator === undefined ? EMPTY : promote(separator)
  inners = inners.map(promote)
  const recurse = function* (string, i, matches) {
    const depth = matches.length
    if (depth in inners) {
      const sep = matches.length === 0 ? EMPTY : separator // no leading separator
      const inner = inners[depth]
      for (const sepresult of sep(string, i)) {
        // Ignore sepresult.match
        for (const result of inner(string, sepresult.j)) {
          yield* recurse(string, result.j, [...matches, result.match])
        }
      }
    } else {
      yield {
        match: matches,
        j: i
      }
    }
  }
  return function* (string, i) {
    yield* recurse(string, i, [])
  }
}

const times = (inner, min, max, separator) => {
  // `min` and `max` are inclusive
  if (separator !== undefined && min < 1) {
    throw Error('Not well-defined for less than 1 copy')
  }
  if (!inner) {
    throw Error('huh')
  }
  inner = promote(inner)
  separator = separator === undefined ? EMPTY : promote(separator)
  const recurse = function* (string, i, matches) {
    if (min <= matches.length) {
      yield {
        match: matches,
        j: i
      }
    }
    if (matches.length < max) {
      const sep = matches.length === 0 ? EMPTY : separator // no leading separator
      for (const sepresult of sep(string, i)) {
        // Ignore sepresult.match
        for (const result of inner(string, sepresult.j)) {
          yield* recurse(string, result.j, [...matches, result.match])
        }
      }
    }
  }
  return function* (string, i) {
    yield* recurse(string, i, [])
  }
}

const star = inner =>
  times(inner, 0, Infinity)

const plus = (inner, separator) =>
  times(inner, 1, Infinity, separator)

const maybe = inner => {
  inner = promote(inner)
  return function* (string, i) {
    yield* EMPTY(string, i)
    yield* inner(string, i)
  }
}

// inners are values of the object returned from `ref`
const resolve = open => {
  const closed = Object.fromEntries(
    Object.entries(
      open(nonterminal =>
        (string, i) =>
          closed[nonterminal](string, i)
      )
    ).map(([nonterminal, inner]) =>
      [nonterminal, promote(inner)]
    )
  )
  return closed
}

const map = (inner, f) => {
  inner = promote(inner)
  return function* (string, i) {
    for (const value of inner(string, i)) {
      yield {
        match: f(value.match),
        j: value.j
      }
    }
  }
}

const filter = (inner, f) => {
  inner = promote(inner)
  return function* (string, i) {
    for (const value of inner(string, i)) {
      if (f(value.match)) {
        yield value
      }
    }
  }
}

const regex = regExp => function* (string, i) {
  const result = regExp.match(string.substring(i))
  if (result !== null) {
    yield {
      match: [...result],
      j: i + result[0].length
    }
  }
}

module.exports = {
  NOTHING,
  EMPTY,
  CHR,
  UNICODE,
  fixed,
  or,
  seq,
  times,
  star,
  plus,
  maybe,
  resolve,
  map,
  filter
}
