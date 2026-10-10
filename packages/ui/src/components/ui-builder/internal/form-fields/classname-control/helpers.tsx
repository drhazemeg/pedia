export function isTailwindClass<T extends readonly string[]>(
  arr: T,
  token: string
): token is T[number] {
  return arr.includes(token);
}

//Helper function to only return specific types from a classname array
export function filterClassnameArray<
  T extends readonly string[],
  U extends ReadonlyArray<T[number]>,
>(array: T, types: U): Array<U[number]> {
  return array.filter((item) => types.includes(item));
}
