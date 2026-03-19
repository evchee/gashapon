export function isTTY() {
    return Boolean(process.stdout.isTTY);
}
export function useColor() {
    return isTTY() && !process.env.NO_COLOR;
}
