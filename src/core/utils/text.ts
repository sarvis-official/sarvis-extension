export function truncate(
    text: string,
    length = 200
) {
    if (text.length <= length) {
        return text;
    }

    return (
        text.slice(0, length) + "..."
    );
}

export function removeExtraSpaces(
    text: string
) {
    return text.replace(/\s+/g, " ").trim();
}

export function capitalize(
    text: string
) {
    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );
}