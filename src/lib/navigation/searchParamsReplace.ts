/**
 * Avoid history.replaceState when the serialized query string is unchanged.
 * React Router still calls replaceState for equal params, which can hit Chrome's
 * "more than 100 times per 10 seconds" limit during search typing.
 */
export function searchParamsToString(params: URLSearchParams): string {
  return params.toString()
}

export function searchParamsEqual(a: URLSearchParams, b: URLSearchParams): boolean {
  return a.toString() === b.toString()
}
