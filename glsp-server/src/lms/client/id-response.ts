import { AnyObject, hasStringProp } from '@eclipse-glsp/server-node';

export interface ModelIdResponse {
    id: string;
}

export namespace ModelIdResponse {
    export function is(obj: unknown): obj is ModelIdResponse {
        return AnyObject.is(obj) && hasStringProp(obj, 'id');
    }
}
