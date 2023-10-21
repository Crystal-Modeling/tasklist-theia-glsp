import { Action, ActionHandler, Logger, MaybePromise } from '@eclipse-glsp/server-node';
import { inject, injectable } from 'inversify';

@injectable()
export class LmsAutolayoutActionHandler implements ActionHandler {
    actionKinds = [AutolayoutConfigAction.KIND];

    @inject(Logger)
    protected logger: Logger;

    execute(action: AutolayoutConfigAction): MaybePromise<Action[]> {
        this.logger.info('Received autolayout config action', action);
        return [];
    }
}

// TODO: Remove duplicates (action declared in glsp-server)
interface AutolayoutConfigAction extends Action {
    kind: typeof AutolayoutConfigAction.KIND;
    enable: boolean;
}

namespace AutolayoutConfigAction {
    export const KIND = 'autolayout-config';
}
