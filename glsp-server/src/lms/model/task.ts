export interface Task {
    id: string;
    name: string;
    content: string;
}

export namespace Task {
    export function is(obj: any): obj is Task {
        return typeof obj.id === 'string' && typeof obj.name === 'string' && typeof obj.content === 'string';
    }
}
