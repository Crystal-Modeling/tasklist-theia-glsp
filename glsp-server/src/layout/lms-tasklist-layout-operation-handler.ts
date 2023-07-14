import {
    ActionDispatcher,
    DefaultTypes,
    DiagramConfiguration,
    GBoundsAware,
    GModelElement,
    GModelRoot,
    LayoutEngine,
    LayoutOperation,
    Logger,
    ModelSubmissionHandler,
    Operation,
    OperationHandler,
    ServerLayoutKind,
    isGBoundsAware
} from '@eclipse-glsp/server-node';
import { inject, injectable, optional } from 'inversify';
import { Task } from '../model/tasklist-model';
import { TaskListModelState } from '../model/tasklist-model-state';

@injectable()
export class TaskListLayoutOperationHandler implements OperationHandler {
    @inject(Logger)
    protected logger: Logger;

    @inject(LayoutEngine)
    @optional()
    protected layoutEngine?: LayoutEngine;

    @inject(DiagramConfiguration)
    protected diagramConfiguration: DiagramConfiguration;

    @inject(TaskListModelState)
    protected modelState: TaskListModelState;

    @inject(ActionDispatcher)
    protected actionDispatcher: ActionDispatcher;

    @inject(ModelSubmissionHandler)
    protected submissionHandler: ModelSubmissionHandler;

    readonly operationType = LayoutOperation.KIND;
    async execute(operation: Operation): Promise<void> {
        if (operation.kind === LayoutOperation.KIND) {
            if (this.diagramConfiguration.layoutKind === ServerLayoutKind.MANUAL) {
                if (this.layoutEngine) {
                    const newGModel = await this.layoutEngine.layout();
                    this.applyBounds(newGModel);
                    this.actionDispatcher.dispatchAll(this.submissionHandler.submitModelDirectly());
                } else {
                    this.logger.warn('Could not execute layout operation. No `LayoutEngine` is bound!');
                }
            }
        }
    }

    protected applyBounds(root: GModelRoot): void {
        root.children
            .filter((node): node is GModelElement & GBoundsAware => node.type === DefaultTypes.NODE && isGBoundsAware(node))
            .forEach(nodeBounds => {
                const element = this.modelState.index.getSModel(nodeBounds.id, Task.is);
                element.position = nodeBounds.position ?? element.position;
                element.size = nodeBounds.size;
            });
    }
}
