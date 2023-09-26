import { AnyObject, hasStringProp } from '@eclipse-glsp/server-node';
import { ElementUpdate, RootUpdate } from './updates';
import { ModelUri } from './uri';

export interface Task {
    id: string;
    name: string;
    content: string;
}

export namespace Task {
    export function is(obj: unknown): obj is Task {
        return AnyObject.is(obj) && hasStringProp(obj, 'id') && hasStringProp(obj, 'name') && hasStringProp(obj, 'content');
    }

    export function isUpdate(obj: RootUpdate): obj is RootUpdate & ElementUpdate<Task> {
        return obj.modelUri.startsWith(ModelUri.of(ModelUri.Segment.property('tasks')));
    }
}
