export function parseAppServerLine(line) {
  try {
    const message = JSON.parse(line);
    return message && typeof message === 'object' ? message : null;
  } catch { return null; }
}

export function extractGoalResponse(message, requestId) {
  return message?.id === requestId && message.result?.goal ? message.result.goal : null;
}
