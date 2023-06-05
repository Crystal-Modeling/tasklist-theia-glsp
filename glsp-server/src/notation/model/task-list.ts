import { AnyObject, hasStringProp } from '@eclipse-glsp/server-node';
import { isArray } from '../../lms/utils/type-utils';
import { Task } from './task';

export interface TaskList {
    id: string;
    tasks: Task[];
}

export namespace TaskList {
    export function is(obj: unknown): obj is TaskList {
        return AnyObject.is(obj) && hasStringProp(obj, 'id') && isArray(obj.tasks, Task.is);
    }
    export function create(semanticId: string): TaskList {
        return { id: semanticId, tasks: [] };
    }
}
