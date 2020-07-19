/**
  Wraps up the supplied simple match generator in an object which parses the
  entire string and ensures that there is only one possible way to parse the
  string. If there is exactly one parse tree it returns it alone, otherwise it
  throws  some kind of exception.
*/
const MonoParser = inner => string => {
  let first
  for (const value of inner(string, 0)) {
    if (value.j !== string.length) {
      continue
    }

    if (first) {
      throw Error('Expected 1 result, got at least 2')
    }

    first = value
  }

  if (!first) {
    throw Error('Expected 1 result, got 0')
  }

  return first.match
}
