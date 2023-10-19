import { GModelElement, GNode, Marker, MarkerKind, ModelValidator } from '@eclipse-glsp/server-node';
import { inject, injectable } from 'inversify';
import { LmsClient } from '../lms/client/lms-client';

@injectable()
export class LmsModelValidator implements ModelValidator {
    @inject(LmsClient)
    protected lmsClient: LmsClient;

    async validate(elements: GModelElement[]): Promise<Marker[]> {
        console.debug(
            'Validating model',
            elements.map(({ id, root, type }) => ({ id, type, root }))
        );
        return Promise.all(elements.map(({ root }) => this.lmsClient.validate(root.id))) //
            .then(responses => responses.flat());
    }

    protected validateGNode(element: GNode): Marker {
        return {
            kind: MarkerKind.INFO,
            description: 'This graphical element is a node',
            elementId: element.id,
            label: 'Node'
        };
    }
}
