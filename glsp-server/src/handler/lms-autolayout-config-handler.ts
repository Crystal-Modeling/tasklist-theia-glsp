import { Action, ActionHandler, MaybePromise } from '@eclipse-glsp/server-node';
import { inject, injectable } from 'inversify';
import { AutolayoutConfigAction } from '../lms/action-protocol/autolayout-configuration';
import { LmsConfiguration } from '../lms/lms-configuration';

@injectable()
export class LmsAutolayoutActionHandler implements ActionHandler {
    actionKinds = [AutolayoutConfigAction.KIND];

    @inject(LmsConfiguration)
    protected lmsConfiguration: LmsConfiguration;

    execute(action: AutolayoutConfigAction): MaybePromise<Action[]> {
        this.lmsConfiguration.autolayouting = action.enable;
        return [];
    }
}
