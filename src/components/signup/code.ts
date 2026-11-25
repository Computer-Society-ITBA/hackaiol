export const CODE_LENGTH = 6

/** The code is held as a fixed-length string; blank slots are spaces. */
export const emptyCode = ' '.repeat(CODE_LENGTH)

export const isCodeComplete = (code: string) =>
  code.length === CODE_LENGTH && !/\D/.test(code)
