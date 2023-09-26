import { AnyObject, hasStringProp } from '@eclipse-glsp/server-node';
import { ElementUpdate, RootUpdate } from './updates';
import { ModelUri } from './uri';

export interface Transition {
    id: string;
    sourceTaskId: string;
    targetTaskId: string;
}

export namespace Transition {
    export function is(obj: unknown): obj is Transition {
        return AnyObject.is(obj) && hasStringProp(obj, 'id') && hasStringProp(obj, 'sourceTaskId') && hasStringProp(obj, 'targetTaskId');
    }

    export function isUpdate(obj: RootUpdate): obj is RootUpdate & ElementUpdate<Transition> {
        return obj.modelUri.startsWith(ModelUri.of(ModelUri.Segment.property('transitions')));
    }
}
