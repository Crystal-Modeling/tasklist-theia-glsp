import {
    DeleteElementOperation,
    GEdge,
    GModelElement,
    GNode,
    MaybePromise,
    OperationHandler,
    toTypeGuard
} from '@eclipse-glsp/server-node';
import { inject, injectable } from 'inversify';
import { TaskListLmsClient } from '../lms/client/tasklist-lms-client';
import { TaskListModelState } from '../model/tasklist-model-state';

@injectable()
export class TaskListDeleteElementHandler implements OperationHandler {
    readonly operationType = DeleteElementOperation.KIND;

    @inject(TaskListModelState)
    protected modelState: TaskListModelState;

    @inject(TaskListLmsClient)
    protected lmsClient: TaskListLmsClient;

    execute(operation: DeleteElementOperation): MaybePromise<void> {
        const modelIds = operation.elementIds.map(elementId => this.getSourceElementId(elementId));
        this.lmsClient.deleteModels(this.modelState.taskList.id, modelIds);
    }

    private getSourceElementId(elementId: string): string {
        const index = this.modelState.index;
        let element: GModelElement | undefined = index.get(elementId);
        if (!(element instanceof GNode || element instanceof GEdge)) {
            element = index.findParentElement(elementId, toTypeGuard(GNode)) ?? index.findParentElement(elementId, toTypeGuard(GEdge));
        }

        return (element ? index.findTaskOrTransition(element?.id)?.id : elementId) ?? elementId;
    }
}
