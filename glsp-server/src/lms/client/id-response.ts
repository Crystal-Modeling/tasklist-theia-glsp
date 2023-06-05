export interface ModelIdResponse {
    id: string;
}

export namespace ModelIdResponse {
    export function is(obj: any): obj is ModelIdResponse {
        return typeof obj.id === 'string';
    }
}
