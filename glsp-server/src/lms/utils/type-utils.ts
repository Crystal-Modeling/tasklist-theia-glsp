import { AnyObject, TypeGuard } from '@eclipse-glsp/server-node';

export function isArray<T>(obj: unknown, ofType: TypeGuard<T>): obj is T[] {
    return AnyObject.is(obj) && Array.isArray(obj) && (obj.length === 0 || ofType(obj[0]));
}
