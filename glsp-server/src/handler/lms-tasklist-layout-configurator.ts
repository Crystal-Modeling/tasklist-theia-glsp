import { AbstractLayoutConfigurator, LayoutOptions } from '@eclipse-glsp/layout-elk';
import { GGraph } from '@eclipse-glsp/server-node';
import { injectable } from 'inversify';

@injectable()
export class TaskListLayoutConfigurator extends AbstractLayoutConfigurator {
    protected override graphOptions(graph: GGraph): LayoutOptions | undefined {
        return {
            'elk.algorithm': 'layered'
        };
    }
}
