export const isGlob = (string: string) => {
  return string.includes('*')
}

export const globToRegex = (string: string) => {
  return new RegExp('^' + string.replace(/\*/g, '.*'))
}

export const keys = <T extends object>(object: T): (keyof T)[] => {
  const objectKeys = Object.keys(object)

  // eslint-disable-next-line
  return objectKeys.filter(key => object.hasOwnProperty(key)) as any
}
