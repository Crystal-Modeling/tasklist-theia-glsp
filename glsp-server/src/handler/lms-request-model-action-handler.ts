import { Action, ActionHandler, Logger, RequestModelAction, RequestModelActionHandler } from '@eclipse-glsp/server-node';
import * as http2 from 'http2';
import { inject, injectable } from 'inversify';

@injectable()
export class LmsRequestModelActionHandler extends RequestModelActionHandler implements ActionHandler {
    @inject(Logger)
    protected log: Logger;

    override async execute(action: RequestModelAction): Promise<Action[]> {
        this.log.debug('Execute RequestModelAction:', action);
        this.modelState.setAll(action.options ?? {});

        this.notifyClient('Model loading in progress');
        await this.sourceModelStorage.loadSourceModel(action);
        this.log.info('!!!! REQUESTING MODEL FROM LMS ....');
        const session = http2.connect('http://localhost:8080');
        session.on('error', this.log.error);
        const request = session.request({ path: '/' });
        request.end();
        request.setEncoding('utf8');
        let data = '';
        request.on('data', chunk => {
            data += chunk;
        });
        request.on('end', () => {
            this.log.info('!!!! RECEIVED RESPONSE FROM LMS !!!! "' + data + '"');
        });

        // Clear the previous notification.
        this.notifyClient();
        return this.submissionHandler.submitModel();
    }
}
