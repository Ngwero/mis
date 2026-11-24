export function isRedirect(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    String((error as { digest?: unknown }).digest).includes('NEXT_REDIRECT')
  )
}

export function friendly(error: unknown) {
  const message = error instanceof Error ? error.message : 'Something went wrong'
  if (message.includes('UNIQUE')) return 'That code or record already exists.'
  if (message.includes('FOREIGN KEY')) return 'That record is linked to other data, so it could not be changed.'
  return message
}
