import { createHash } from 'crypto';

export function hashString(text: string): string {
    const hash = createHash('sha256');
    hash.update(text);
    return hash.digest('hex');
}


/* if the string is too long, trim it, leaving the beginning, then "..." in the middle, then the end, such that its length is equal to the threshold */
export function trimString(text: string, threshold: number): string {
    if (text.length <= threshold) {
        return text;
    }
    const start = text.slice(0, Math.floor(threshold / 2) - 2);
    const end = text.slice(text.length - Math.floor(threshold / 2) + 2);
    return start + '...' + end;
}

export const skip_ext = ['lock', 'png', 'svg'];
export const skip_paths = ['node_modules', '.git', '.trunk', 'linter', '__pycache__', '.github'];


export function saveCache(cache: Record<string, any>, path: string) {
    /* write the cache to a file, do not wait for the process to finish */
    require('fs').writeFile(path, JSON.stringify(cache), (err: any) => {
        if (err) {
            console.error(err);
        }
    });
}

export function loadCache(path: string): Record<string, any> {
    try {
        return JSON.parse(require('fs').readFileSync(path, 'utf8'));
    } catch (e: any) {
        return {};
    }
}
