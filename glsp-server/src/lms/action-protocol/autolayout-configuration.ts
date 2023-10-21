import { Action } from '@eclipse-glsp/server-node';

// TODO: Remove duplicates (action declared in glsp-server)
export interface AutolayoutConfigAction extends Action {
    kind: typeof AutolayoutConfigAction.KIND;
    enable: boolean;
}

export namespace AutolayoutConfigAction {
    export const KIND = 'autolayout-config';
}
