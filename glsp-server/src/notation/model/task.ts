import { AnyObject, hasObjectProp, hasStringProp } from '@eclipse-glsp/server-node';

export interface Task {
    id: string;
    position: { x: number; y: number };
    size?: { width: number; height: number };
}

export namespace Task {
    export function is(obj: unknown): obj is Task {
        return AnyObject.is(obj) && hasStringProp(obj, 'id') && hasObjectProp(obj, 'position');
    }
}
