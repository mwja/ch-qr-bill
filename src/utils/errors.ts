/**
 * Tauri rejects commands with a plain string, react-query hands back `Error`s:
 * both need to become something React can render.
 */
export function errorMessage(error: unknown): string | null {
    if (!error) {
        return null;
    }

    if (typeof error === "string") {
        return error;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}
