import { AnyObject, hasStringProp } from '@eclipse-glsp/server-node';

export interface Task {
    id: string;
    name: string;
    content: string;
}

export namespace Task {
    export function is(obj: unknown): obj is Task {
        return AnyObject.is(obj) && hasStringProp(obj, 'id') && hasStringProp(obj, 'name') && hasStringProp(obj, 'content');
    }
}
