import { Logger, TypeGuard } from '@eclipse-glsp/server-node';
import * as fs from 'fs';
import * as http2 from 'http2';
import { inject, injectable } from 'inversify';
import * as path from 'path';
import { promisify } from 'util';
import { Model, Task, Transition } from '../model';
import { Action } from '../model/actions';
import { Creation, Modification, ModificationResult } from '../model/modifications';
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
        const request = this.lmsSession.request({ [HTTP2_HEADER_PATH]: `/models/id?uri=${notationsUri}` });
        request.setEncoding('utf8');

        return (await this.getResponseObject(request, ModelIdResponse.is)).id;
    }

    public async getModelById(id: string): Promise<Model> {
        this.logger.info('!!!! REQUESTING MODEL FROM LMS. ID = ', id);
        if (!this.lmsSession) {
            this.lmsSession = this.createLmsSession();
        }

        const { HTTP2_HEADER_PATH } = http2.constants;
        const request = this.lmsSession.request({ [HTTP2_HEADER_PATH]: `/models/${id}` });
        request.setEncoding('utf8');

        return this.getResponseObject(request, Model.is);
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

    public async persist(rootId: string): Promise<void> {
        this.logger.debug('Persisting Source model', rootId);
        if (!this.lmsSession) {
            this.lmsSession = this.createLmsSession();
        }

        const { HTTP2_HEADER_PATH, HTTP2_HEADER_METHOD } = http2.constants;
        const request = this.lmsSession.request({
            [HTTP2_HEADER_PATH]: `/models/${rootId}/persist`,
            [HTTP2_HEADER_METHOD]: 'PUT'
        });
        request.setEncoding('utf8');

        return this.getResponse(request);
    }

    public async createTask(rootId: string, creation: Creation<Task>, anchorModelId?: string): Promise<ModificationResult> {
        return this.create('task', rootId, creation, anchorModelId);
    }

    public async createTransition(rootId: string, creation: Creation<Transition>): Promise<ModificationResult> {
        return this.create('transition', rootId, creation);
    }

    private async create(domain: 'task', rootId: string, creation: Creation<Task>, anchorModelId?: string): Promise<ModificationResult>;
    private async create(domain: 'transition', rootId: string, creation: Creation<Transition>): Promise<ModificationResult>;
    private async create(domain: string, rootId: string, creation: Creation, anchorModelId?: string): Promise<ModificationResult> {
        this.logger.debug(`Creating ${domain} in '${rootId}':`, creation);

        if (!this.lmsSession) {
            this.lmsSession = this.createLmsSession();
        }

        const { HTTP2_HEADER_PATH, HTTP2_HEADER_METHOD } = http2.constants;
        const request = this.lmsSession.request({
            [HTTP2_HEADER_PATH]: `/models/${rootId}/${domain}s` + (anchorModelId ? `?anchorModelId=${anchorModelId}` : ''),
            [HTTP2_HEADER_METHOD]: 'POST'
        });
        request.setEncoding('utf8');
        request.write(JSON.stringify(creation), 'utf8');

        return this.getResponseObject(request, ModificationResult.is);
    }

    public async updateTask(rootId: string, modification: Modification<Task>): Promise<ModificationResult> {
        return this.update('task', rootId, modification);
    }

    public async updateTransition(rootId: string, modification: Modification<Transition>): Promise<ModificationResult> {
        return this.update('transition', rootId, modification);
    }

    private async update(domain: 'task', rootId: string, modification: Modification<Task>): Promise<ModificationResult>;
    private async update(domain: 'transition', rootId: string, modification: Modification<Transition>): Promise<ModificationResult>;
    private async update(domain: string, rootId: string, modification: Modification): Promise<ModificationResult> {
        this.logger.debug(`Updating ${domain} in '${rootId}' with ID ${modification.id}`);

        if (!this.lmsSession) {
            this.lmsSession = this.createLmsSession();
        }

        const { HTTP2_HEADER_PATH, HTTP2_HEADER_METHOD } = http2.constants;
        const request = this.lmsSession.request({
            [HTTP2_HEADER_PATH]: `/models/${rootId}/${domain}s/${modification.id}`,
            [HTTP2_HEADER_METHOD]: 'PUT'
        });
        request.setEncoding('utf8');
        request.write(JSON.stringify(modification), 'utf8');

        return this.getResponseObject(request, ModificationResult.is);
    }

    public async deleteTask(rootId: string, taskId: string): Promise<ModificationResult> {
        return this.delete('task', rootId, taskId);
    }

    public async deleteTransition(rootId: string, transitionId: string): Promise<ModificationResult> {
        return this.delete('transition', rootId, transitionId);
    }

    public async deleteModels(rootId: string, modelIds: string[]): Promise<ModificationResult> {
        this.logger.debug(`Updating models in '${rootId}' with IDs ${modelIds}`);

        if (!this.lmsSession) {
            this.lmsSession = this.createLmsSession();
        }

        const { HTTP2_HEADER_PATH, HTTP2_HEADER_METHOD } = http2.constants;
        const request = this.lmsSession.request({
            [HTTP2_HEADER_PATH]: `/models/${rootId}`,
            [HTTP2_HEADER_METHOD]: 'PUT'
        });
        request.setEncoding('utf8');
        request.write(JSON.stringify(modelIds), 'utf8');

        return this.getResponseObject(request, ModificationResult.is);
    }

    private async delete(domain: 'task', rootId: string, modelId: string): Promise<ModificationResult>;
    private async delete(domain: 'transition', rootId: string, modelId: string): Promise<ModificationResult>;
    private async delete(domain: string, rootId: string, modelId: string): Promise<ModificationResult> {
        this.logger.debug(`Deleting ${domain} in '${rootId}' with ID ${modelId}`);

        if (!this.lmsSession) {
            this.lmsSession = this.createLmsSession();
        }

        const { HTTP2_HEADER_PATH, HTTP2_HEADER_METHOD } = http2.constants;
        const request = this.lmsSession.request({
            [HTTP2_HEADER_PATH]: `/models/${rootId}/${domain}s/${modelId}`,
            [HTTP2_HEADER_METHOD]: 'DELETE'
        });
        request.setEncoding('utf8');

        return this.getResponseObject(request, ModificationResult.is);
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

    private async getResponse(request: http2.ClientHttp2Stream): Promise<void> {
        request.end();
        await promisify(request.once.bind(request))('end');
    }

    private async getResponseObject<T>(request: http2.ClientHttp2Stream, guard: TypeGuard<T>): Promise<T> {
        const data = await this.getResponseAsString(request);
        return this.convertResponseToJson(data, guard);
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
