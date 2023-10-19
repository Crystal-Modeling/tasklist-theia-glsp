import { AnyObject, hasStringProp } from '@eclipse-glsp/server-node';

export interface Action<S extends string = string> {
    __state: S;
}

export namespace Action {
    export function is(obj: unknown): obj is Action {
        return AnyObject.is(obj) && hasStringProp(obj, '__state');
    }
}

export interface Highlight extends Action<'HIGHLIGHTED'> {
    id: string;
}

export namespace Highlight {
    export function is(obj: unknown): obj is Highlight {
        return AnyObject.is(obj) && obj.__state === 'HIGHLIGHTED';
    }
}

export interface Save extends Action<'SAVED'> {}

export namespace Save {
    export function is(obj: unknown): obj is Save {
        return AnyObject.is(obj) && obj.__state === 'SAVED';
    }
}
