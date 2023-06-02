import { Action, ActionHandler, Logger, RequestModelAction, RequestModelActionHandler } from '@eclipse-glsp/server-node';
import * as fs from 'fs';
import * as http2 from 'http2';
import { inject, injectable } from 'inversify';
import * as path from 'path';

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
        const certificateAuthority = fs.readFileSync(path.join(__dirname, '../lms-ssl/cert.pem'));
        const session = http2.connect('https://localhost:8443', {
            // we don't have to do this if our certificate is signed by
            // a recognized certificate authority, like LetsEncrypt
            ca: certificateAuthority
        });
        const { HTTP2_HEADER_PATH } = http2.constants;
        session.on('error', this.log.error);
        const request = session.request({ [HTTP2_HEADER_PATH]: '/models/a5b691ce-5902-4d5f-bb6f-7ec31f9ad595' });
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
