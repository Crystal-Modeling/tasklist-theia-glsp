import { AnyObject, hasStringProp } from '@eclipse-glsp/server-node';

export type ElementState = 'DISAPPEARED' | 'REAPPEARED';

export type ElementUpdate<T> = {
    id: string;
    __state?: ElementState;
} & UpdateOptionalProps<T>;

type UpdateOptionalProps<T> = {
    [P in keyof Omit<T, 'id'>]?: T[P];
};

export namespace ElementUpdate {
    export function is<T>(obj: unknown): obj is ElementUpdate<T> {
        return AnyObject.is(obj) && hasStringProp(obj, 'id');
    }
}

export interface ArrayUpdate<T> {
    added?: T[];
    removedIds?: string[];
    changed?: Array<ElementUpdate<T>>;
}
