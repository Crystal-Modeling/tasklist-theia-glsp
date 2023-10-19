import { AnyObject, Logger, Marker, TypeGuard, hasStringProp } from '@eclipse-glsp/server-node';
import * as fs from 'fs';
import * as http2 from 'http2';
import { inject, injectable } from 'inversify';
import * as path from 'path';
import { promisify } from 'util';
import { isArray } from '../utils/type-utils';
import { LmsClientError } from './error';

@injectable()
export abstract class LmsClient {
    @inject(Logger)
    protected logger: Logger;

    protected lmsSession: http2.ClientHttp2Session | undefined;

    public async validate(rootId: string): Promise<Marker[]> {
        this.logger.info('!!!! VALIDATING MODEL THROUGH LMS. ID = ', rootId);
        if (!this.lmsSession) {
            this.lmsSession = this.createLmsSession();
        }

        const { HTTP2_HEADER_PATH, HTTP2_HEADER_METHOD } = http2.constants;
        const request = this.lmsSession.request({
            [HTTP2_HEADER_PATH]: `/models/${rootId}/validation`,
            [HTTP2_HEADER_METHOD]: 'GET'
        });
        request.setEncoding('utf8');

        return this.getResponseObject(request, (obj): obj is Marker[] => isArray(obj, isMarker));
    }

    protected createLmsSession(): http2.ClientHttp2Session {
        this.logger.info('Creating LMS Session...');
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

    protected async getResponse(request: http2.ClientHttp2Stream): Promise<void> {
        request.end();
        await promisify(request.once.bind(request))('end');
    }

    protected async getResponseObject<T>(request: http2.ClientHttp2Stream, guard: TypeGuard<T>): Promise<T> {
        const data = await this.getResponseAsString(request);
        return this.convertResponseToJson(data, guard);
    }

    protected async getResponseAsString(request: http2.ClientHttp2Stream): Promise<string> {
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

    protected parseResponse(responseData: string): object {
        this.logger.info('!!!! RECEIVED RESPONSE FROM LMS !!!! "' + responseData + '"');
        return JSON.parse(responseData);
    }
}

function isMarker(obj: unknown): obj is Marker {
    return (
        AnyObject.is(obj) &&
        hasStringProp(obj, 'label') &&
        hasStringProp(obj, 'description') &&
        hasStringProp(obj, 'elementId') &&
        hasStringProp(obj, 'kind')
    );
}
