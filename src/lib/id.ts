/** Small, dependency-free unique id generator good enough for local data. */
export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36).slice(-4);
  return `${prefix}${prefix ? '_' : ''}${time}${rand}`;
}
