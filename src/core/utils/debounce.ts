export function debounce<
    T extends (...args: any[]) => void
>(
    callback: T,
    delay: number
) {
    let timeout:
        NodeJS.Timeout;

    return (...args: Parameters<T>) => {
        clearTimeout(timeout);

        timeout = setTimeout(() => {
            callback(...args);
        }, delay);
    };
}