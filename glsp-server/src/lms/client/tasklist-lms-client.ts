import { Logger, TypeGuard } from '@eclipse-glsp/server-node';
import * as fs from 'fs';
import * as http2 from 'http2';
import { inject, injectable } from 'inversify';
import * as path from 'path';
import { promisify } from 'util';
import { Model } from '../model';
import { Action } from '../model/actions';
import { RootUpdate } from '../model/updates';
import { LmsClientError } from './error';
import { ModelIdResponse } from './id-response';

@injectable()
export class TaskListLmsClient {
    @inject(Logger)
    private logger: Logger;

    private lmsSession: http2.ClientHttp2Session | undefined;

    public async getModelId(notationsPath: string): Promise<string> {
        // HACK: Yet another... This endpoint should be temporal: now I manually tweak notation sourcePath to turn it into a URI
        const notationsUri = 'file://' + notationsPath;
        this.logger.info(`!!!! REQUESTING MODEL ID FOR '${notationsUri}' ....`);
        if (!this.lmsSession) {
            this.lmsSession = this.createLmsSession();
        }

        const { HTTP2_HEADER_PATH } = http2.constants;
        const request = this.lmsSession.request({ [HTTP2_HEADER_PATH]: `/models/id/${notationsUri}` });
        request.setEncoding('utf8');

        const data = await this.getResponseAsString(request);
        return this.convertResponseToJson(data, ModelIdResponse.is).id;
    }

    public async getModelById(id: string): Promise<Model> {
        this.logger.info('!!!! REQUESTING MODEL FROM LMS. ID = ', id);
        if (!this.lmsSession) {
            this.lmsSession = this.createLmsSession();
        }

        const { HTTP2_HEADER_PATH } = http2.constants;
        const request = this.lmsSession.request({ [HTTP2_HEADER_PATH]: `/models/${id}` });
        request.setEncoding('utf8');

        const data = await this.getResponseAsString(request);
        return this.convertResponseToJson(data, Model.is);
    }

    public subscribeToModelChanges(
        id: string,
        modelUpdateHandler: (update: RootUpdate) => void,
        actionHandler: (action: Action) => void
    ): void {
        this.logger.info('!!!! SUBSCRIBING TO MODEL BY ID', id);
        if (!this.lmsSession) {
            this.lmsSession = this.createLmsSession();
        }

        const { HTTP2_HEADER_PATH, HTTP2_HEADER_METHOD } = http2.constants;
        const request = this.lmsSession.request({
            [HTTP2_HEADER_PATH]: `/models/${id}/subscriptions`,
            [HTTP2_HEADER_METHOD]: 'POST'
        });
        request.setEncoding('utf8');

        request.once('data', response => {
            console.debug('Got response from subscriptions endpoint', response);
            request.on('data', updateStr => {
                const update = this.parseResponse(updateStr);
                if (Action.is(update)) {
                    actionHandler(update);
                } else if (RootUpdate.is(update)) {
                    modelUpdateHandler(update);
                } else {
                    throw new LmsClientError("Response received from LMS doesn't comply to expected format");
                }
            });
        });
        request.end();
        request.once('end', () => {
            console.debug('The subscription to LMS model with id', id, 'is ended');
        });
    }

    public async highlight(rootId: string, modelId: string): Promise<void> {
        this.logger.info('!!!! Highlighting the MODEL BY ROOT ID', rootId, 'and MODEL ID', modelId);
        if (!this.lmsSession) {
            this.lmsSession = this.createLmsSession();
        }

        const { HTTP2_HEADER_PATH, HTTP2_HEADER_METHOD } = http2.constants;
        const request = this.lmsSession.request({
            [HTTP2_HEADER_PATH]: `/models/${rootId}/highlight/${modelId}`,
            [HTTP2_HEADER_METHOD]: 'PUT'
        });
        request.setEncoding('utf8');

        return this.getResponse(request);
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

    private async getResponse(request: http2.ClientHttp2Stream): Promise<void> {
        request.end();
        await promisify(request.once.bind(request))('end');
    }

    private convertResponseToJson<T>(responseData: string, guard: TypeGuard<T>): T {
        const response = this.parseResponse(responseData);
        if (guard(response)) {
            return response;
        }
        throw new LmsClientError("Response received from LMS doesn't comply to expected format");
    }

    private parseResponse(responseData: string): object {
        this.logger.info('!!!! RECEIVED RESPONSE FROM LMS !!!! "' + responseData + '"');
        return JSON.parse(responseData);
    }
}
