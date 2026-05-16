export class Logger {
    static info(
        message: string,
        data?: unknown
    ) {
        console.log(
            `[Sarvis] ${message}`,
            data || ""
        );
    }

    static warn(
        message: string,
        data?: unknown
    ) {
        console.warn(
            `[Sarvis] ${message}`,
            data || ""
        );
    }

    static error(
        message: string,
        error?: unknown
    ) {
        console.error(
            `[Sarvis] ${message}`,
            error || ""
        );
    }
}