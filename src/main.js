/**
  Generator matchers. Yields all possible results, ending immediately if need be.
*/

'use strict'

// It is assumed that `i` is between 0 and `string.length` inclusive.

/**
  Construct a Matcher function from a simple (generator) function.
  `inner` should take `string` and `i` and return a {next: () => ...}
*/
const Matcher = inner => Object.assign(
  // Can't just write `inner` here because we need
  // to add properties to `outer` but we don't want to modify
  // `inner`.
  (string, i) => inner(string, i),

  // Also there are methods and properties on the Matcher
  // function.
  {
    // Transform all of the matches
    map: f => Matcher(function* (string, i) {
      for (const value of inner(string, i)) {
        yield {
          match: f(value.match),
          j: value.j
        }
      }
    }),

    // Only return those matches which pass the filter
    filter: f => Matcher(function* (string, i) {
      for (const value of inner(string, i)) {
        if (f(value.match)) {
          yield value
        }
      }
    }),

    star: () => star(inner),
    plus: () => plus(inner),
    or: other => or([inner, other]),
    seq: other => seq([inner, other]),
    wplus: ws => wplus(inner, ws),
    maybe: () => maybe(inner)
  }
)

/**
  Match any single character from the JS string. Note that a JS string
  is a sequence of 16-bit code units, not a sequence of Unicode characters
*/
const chr = Matcher(function* (string, i) {
  if (i < string.length) {
    yield {
      j: i + 1,
      match: string.substr(i, 1)
    }
  }
})

/**
  Match a single Unicode character from the JS string. This is
  a String of length 1 for BMP code points or a string of length
  2 for astral planes. This can FAIL if the string is not properly
  encoded i.e. surrogates are not paired correctly.
*/
const unicode = Matcher(function* (string, i) {
  if (i >= string.length) {
    return
  }

  const first = string.charAt(i)

  if (0xD800 <= first && first < 0xDC00) {
    if (i + 1 >= string.length) {
      return
    }
    const second = string.charAt(i + 1)
    if (0xDC00 <= second && second < 0xE000) {
      yield {
        j: i + 1 + 1,
        match: first + second
      }
    } // else bad UTF-16
  } else {
    // BMP
    yield {
      j: i + 1,
      match: first
    }
  }
})

// Also there are class methods on the constructor function.
const fixed = needle => Matcher(function* (string, i) {
  if (string.substr(i, needle.length) === needle) {
    yield {
      j: i + needle.length,
      match: needle
    }
  }
})

/**
  Returns all the results from the first matcher and then all the results from
  the next matcher and so on
*/
const or = inners => {
  inners = inners.map(inner => typeof inner === 'string' ? fixed(inner) : inner)

  return Matcher(function* (string, i) {
    for (const inner of inners) {
      yield* inner(string, i)
    }
  })
}

/**
  For each result from the first matcher, returns all the results from the
  next matcher, and so on. Depth-first.
*/
const seq = inners => {
  inners = inners.map(inner => typeof inner === 'string' ? fixed(inner) : inner)

  return Matcher(function* (string, i) {
    const recurse = function* (depth, matches, j) {
      if (depth in inners) {
        const inner = inners[depth]
        for (const result of inner(string, j)) {
          yield* recurse(depth + 1, [...matches, result.match], result.j)
        }
      } else {
        yield {
          match: matches,
          j
        }
      }
    }

    yield* recurse(0, [], i)
  })
}

/**
  Returns an array of the matches. Goes depth-first.
  a* yields [], ['a'], ['a', 'a'], ...
  `inner` doesn't have to be a full-blown `Matcher` object,
  it just needs to be a generator function whose results are like {j, match}.
*/
const star = inner => {
  inner = typeof inner === 'string' ? fixed(inner) : inner

  return Matcher(function* (string, i) {
    const recurse = function* (depth, matches, j) {
      yield {
        match: matches,
        j
      }
      for (const result of inner(string, j)) {
        yield* recurse(depth + 1, [...matches, result.match], result.j)
      }
    }

    yield* recurse(0, [], i)
  })
}

const resolve = open => {
  const closed = open(nonterminal => function () {
    return closed[nonterminal].apply(this, arguments)
  })
  return closed
}

// Bonuses!

/**
  Very familiar
*/
const plus = inner => seq([inner, star(inner)])
  .map(([first, rest]) => [first, ...rest])

/**
  Match a sequence of things, separated by some separator. Don't allow
  anything before or after. The sequence has to have at least one entry. Omit
  the whitespace results from the match.
*/
const wseq = (inners, separator) => {
  if (inners.length === 0) {
    throw Error('Not well-defined for 0 inners')
  }

  return seq(inners.map((inner, i) =>
    i === 0 ? inner : seq([separator, inner]).map(([separator, inner]) => inner)
  ))
}

/**
  Match one or more identical thingies separated by separator...
*/
const wplus = (inner, separator) => seq([
  inner,
  seq([separator, inner]).map(([separator, inner]) => inner).star()
]).map(([first, rest]) => [first, ...rest])

const maybe = inner => or([inner, fixed('')])

/**
  Replace the inner matcher with a parser, which will
  parse the entire supplied string as an instance of the given class. Strip
  the j off the result, too.
  Mainly for internal use in unit tests because it drops through to match()
  in a convenient way.
  `inner` doesn't have to be a full-blown `Matcher` object, as long as it
  returns generators which generate values of the form `{j, match}`.
*/
const Parser = inner => function* (string) {
  for (const value of inner(string, 0)) {
    if (value.j === string.length) {
      yield value.match
    }
  }
}

/**
  Wraps up the supplied matcher in an object which parses the entire string
  and ensures that there is only one possible way to parse the string. If
  there is exactly one parse tree it returns it alone, otherwise it throws
  some kind of exception.
*/
const MonoParser = inner => {
  const parser = Parser(inner)
  return string => {
    const results = [...parser(string)]

    if (results.length !== 1) {
      throw Error('Expected 1 result, got ' + results.length)
    }

    return results[0]
  }
}

module.exports = {
  Matcher,
  chr,
  unicode,
  fixed,
  or,
  seq,
  star,
  resolve,
  plus,
  wseq,
  wplus,
  maybe,
  Parser,
  MonoParser
}
