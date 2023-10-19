import { AnyObject, hasBooleanProp, hasStringProp } from '@eclipse-glsp/server-node';
import { LmsModel } from './model';

export type Modification<T extends LmsModel = LmsModel> = Partial<T> & LmsModel;

export type Creation<T extends LmsModel = LmsModel> = Omit<T, keyof LmsModel>;

export type ModificationResult =
    | {
          successful: true;
          modified: boolean;
      }
    | {
          successful: false;
          failureReason: 'Validation' | 'TextEdit';
          failureMessage?: string;
      };

export namespace ModificationResult {
    export function is(obj: unknown): obj is ModificationResult {
        return AnyObject.is(obj) && (hasBooleanProp(obj, 'modified') || hasStringProp(obj, 'failureReason'));
    }
}
