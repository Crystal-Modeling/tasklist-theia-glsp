import { SaveModelAction } from '@eclipse-glsp/server-node';

/**
 * Sent from the client to the server in order to persist the current model state back to the source model.
 * A new fileUri can be defined to save the model to a new destination different from its original source model.
 * The corresponding namespace declares the action kind as constant and offers helper functions for type guard checks
 * and creating new `SaveModelActions`.
 */
export interface LmsSaveModelAction extends SaveModelAction {
    ignoreSourceModel?: boolean;
}

export namespace LmsSaveModelAction {
    export function create(lmsOptions: { ignoreSourceModel: boolean }, options: { fileUri?: string } = {}): LmsSaveModelAction {
        return Object.assign(SaveModelAction.create(options), lmsOptions);
    }
}
