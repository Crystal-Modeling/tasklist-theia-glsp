import { AnyObject, hasStringProp } from '@eclipse-glsp/server-node';
import { isArray } from '../utils/type-utils';
import { Task } from './task';
import { Transition } from './transition';
import { ArrayUpdate } from './updates';

export interface Model {
    id: string;
    tasks: Task[];
    transitions: Transition[];
}

export namespace Model {
    export function is(obj: unknown): obj is Model {
        return AnyObject.is(obj) && hasStringProp(obj, 'id') && isArray(obj.tasks, Task.is) && isArray(obj.transitions, Transition.is);
    }
}

export interface ModelUpdate {
    id: string;
    tasks?: ArrayUpdate<Task>;
    transitions?: ArrayUpdate<Transition>;
}

export namespace ModelUpdate {
    export function is(obj: unknown): obj is ModelUpdate {
        return AnyObject.is(obj) && hasStringProp(obj, 'id');
    }
}
