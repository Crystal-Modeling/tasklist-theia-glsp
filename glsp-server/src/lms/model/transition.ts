import { AnyObject, hasStringProp } from '@eclipse-glsp/server-node';

export interface Transition {
    id: string;
    sourceTaskId: string;
    targetTaskId: string;
}

export namespace Transition {
    export function is(obj: unknown): obj is Transition {
        return AnyObject.is(obj) && hasStringProp(obj, 'id') && hasStringProp(obj, 'sourceTaskId') && hasStringProp(obj, 'targetTaskId');
    }
}
