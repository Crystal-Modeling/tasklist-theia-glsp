import { Logger, TypeGuard } from '@eclipse-glsp/server-node';
import * as fs from 'fs';
import * as http2 from 'http2';
import { inject, injectable } from 'inversify';
import * as path from 'path';
import { promisify } from 'util';
import { Model } from '../model';
import { LmsClientError } from './error';
import { ModelIdResponse } from './id-response';

@injectable()
export class TaskListLmsClient {
    @inject(Logger)
    private logger: Logger;

    private lmsSession: http2.ClientHttp2Session | undefined;

    public async getModelId(sourcePath: string): Promise<string> {
        // HACK: Yet another... This endpoint should be temporal: now I manually tweak notation sourcePath to turn it into a URI
        const sourceUri = 'file://' + sourcePath;
        this.logger.info(`!!!! REQUESTING MODEL ID FOR '${sourceUri}' ....`);
        if (!this.lmsSession) {
            this.lmsSession = this.createLmsSession();
        }

        const { HTTP2_HEADER_PATH } = http2.constants;
        const request = this.lmsSession.request({ [HTTP2_HEADER_PATH]: `/models/id/${sourceUri}` });
        request.setEncoding('utf8');

        const data = await this.getResponseAsString(request);
        return this.convertResponseToJson(data, ModelIdResponse.is).id;
    }

    public async getModelById(id: string): Promise<Model> {
        this.logger.info('!!!! REQUESTING MODEL FROM LMS ....');
        if (!this.lmsSession) {
            this.lmsSession = this.createLmsSession();
        }

        const { HTTP2_HEADER_PATH } = http2.constants;
        const request = this.lmsSession.request({ [HTTP2_HEADER_PATH]: `/models/${id}` });
        request.setEncoding('utf8');

        const data = await this.getResponseAsString(request);
        return this.convertResponseToJson(data, Model.is);
    }

    private createLmsSession(): http2.ClientHttp2Session {
        // TODO: Get rid of hardcoded CA certificate
        const certificateAuthority = fs.readFileSync(path.join(__dirname, '../../lms-ssl/cert.pem'));
        const session = http2.connect('https://localhost:8443', {
            // we don't have to do this if our certificate is signed by
            // a recognized certificate authority, like LetsEncrypt
            ca: certificateAuthority
        });
        session.on('error', this.logger.error);
        return session;
    }

    private async getResponseAsString(request: http2.ClientHttp2Stream): Promise<string> {
        let data = '';
        request.on('data', chunk => {
            data += chunk;
        });
        request.end();
        await promisify(request.once.bind(request))('end');
        return data;
    }

    private convertResponseToJson<T>(responseData: string, guard: TypeGuard<T>): T {
        this.logger.info('!!!! RECEIVED RESPONSE FROM LMS !!!! "' + responseData + '"');
        const response = JSON.parse(responseData);
        if (guard(response)) {
            return response;
        }
        throw new LmsClientError("Response received from LMS doesn't comply to expected format");
    }
}