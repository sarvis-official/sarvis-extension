export interface StreamChunk {
    content: string;

    done: boolean;
}

export async function* parseStream(
    response: Response
): AsyncGenerator<StreamChunk> {
    const reader =
        response.body?.getReader();

    if (!reader) {
        return;
    }

    const decoder =
        new TextDecoder();

    let buffer = "";

    while (true) {
        const {
            done,
            value,
        } = await reader.read();

        if (done) {
            break;
        }

        buffer += decoder.decode(
            value,
            {
                stream: true,
            }
        );

        yield {
            content: buffer,
            done: false,
        };
    }

    yield {
        content: "",
        done: true,
    };
}