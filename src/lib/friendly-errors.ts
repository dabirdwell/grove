/**
 * Converts technical error messages into friendly, user-facing messages.
 * This makes the app feel more like a helpful friend than software.
 */

const ERROR_MAP: Record<string, string> = {
  'No master account set': 'Pick which account receives your income first!',
  'Failed to fetch': 'Having trouble connecting. Check your internet?',
  'Network error': 'Connection hiccup. Your data is safe—try again in a moment.',
  'NetworkError': 'Connection hiccup. Your data is safe—try again in a moment.',
  'Allocation exceeds': "Your buckets add up to more than your income. Let's adjust.",
  'Invalid input': "Hmm, that doesn't look quite right. Try a number like 1500 or 20%",
  'Failed to create bucket': "Couldn't create that bucket. Maybe try a different name?",
  'Failed to delete': "Couldn't remove that. Try refreshing the page.",
  'Unauthorized': 'Your session may have expired. Try refreshing the page.',
  '401': 'Your session may have expired. Try refreshing the page.',
  '403': "You don't have permission to do that.",
  '404': "Couldn't find what you're looking for.",
  '500': 'Something went wrong on our end. Try again in a moment.',
  'Internal server error': 'Something went wrong on our end. Try again in a moment.',
  'timeout': 'That took too long. Try again?',
  'ECONNREFUSED': 'Having trouble connecting to the server.',
  'ENOTFOUND': 'Having trouble connecting. Check your internet?',
};

export function friendlyError(error: string | Error): string {
  const errorMessage = error instanceof Error ? error.message : error;

  // Check each key to see if it's contained in the error message
  for (const [key, friendly] of Object.entries(ERROR_MAP)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return friendly;
    }
  }

  // If no match found, return a generic friendly message for very technical errors
  if (errorMessage.includes('TypeError') || errorMessage.includes('ReferenceError')) {
    return 'Something unexpected happened. Try refreshing the page.';
  }

  // Otherwise, return the original error (it might already be user-friendly)
  return errorMessage;
}
