export class AppError extends Error {
    constructor(
        message: string
    ) {
        super(message);

        this.name = "AppError";
    }
}

export function getErrorMessage(
    error: unknown
): string {
    if (error instanceof Error) {
        return error.message;
    }

    return "Unknown error";
}