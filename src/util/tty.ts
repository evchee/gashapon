export function isTTY(): boolean {
  return Boolean(process.stdout.isTTY)
}

export function useColor(): boolean {
  return isTTY() && !process.env.NO_COLOR
}
