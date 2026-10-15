export function parseAppServerLine(line) {
  try {
    const message = JSON.parse(line);
    return message && typeof message === 'object' ? message : null;
  } catch { return null; }
}
