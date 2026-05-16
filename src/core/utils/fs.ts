import * as fs from "fs";
import * as path from "path";

export function fileExists(
    filePath: string
) {
    return fs.existsSync(filePath);
}

export function readTextFile(
    filePath: string
) {
    return fs.readFileSync(
        filePath,
        "utf8"
    );
}

export function writeTextFile(
    filePath: string,
    content: string
) {
    fs.writeFileSync(
        filePath,
        content,
        "utf8"
    );
}

export function joinPath(
    ...paths: string[]
) {
    return path.join(...paths);
}