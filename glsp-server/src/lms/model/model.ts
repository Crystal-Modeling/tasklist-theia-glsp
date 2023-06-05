import { Task } from './task';
import { Transition } from './transition';

export interface Model {
    id: string;
    tasks: Task[];
    transitions: Transition[];
}

export namespace Model {
    export function is(obj: any): obj is Model {
        return typeof obj.id === 'string' && isArray(obj.tasks, Task.is) && isArray(obj.transitions, Transition.is);
    }
}

type Guard<T> = (obj: any) => obj is T;
function isArray<T>(obj: any, ofType: Guard<T>): obj is T[] {
    return Array.isArray(obj) && (obj.length === 0 || ofType(obj[0]));
}
