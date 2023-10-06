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
import { Task, Transition } from '../model/tasklist-model';
import { TaskListModelState } from '../model/tasklist-model-state';

@injectable()
export class TaskListDeleteElementHandler implements OperationHandler {
    readonly operationType = DeleteElementOperation.KIND;

    @inject(TaskListModelState)
    protected modelState: TaskListModelState;

    @inject(TaskListLmsClient)
    protected lmsClient: TaskListLmsClient;

    execute(operation: DeleteElementOperation): MaybePromise<void> {
        operation.elementIds //
            .map(elementId => this.getSourceElementToDelete(elementId))
            .forEach(sModel => {
                if (sModel) {
                    if (Task.is(sModel)) {
                        this.lmsClient.deleteTask(this.modelState.taskList.id, sModel.id);
                    } else if (Transition.is(sModel)) {
                        this.lmsClient.deleteTransition(this.modelState.taskList.id, sModel.id);
                    }
                }
            });
    }

    private getSourceElementToDelete(elementId: string): Task | Transition | undefined {
        const index = this.modelState.index;
        let element: GModelElement | undefined = index.get(elementId);
        if (!(element instanceof GNode || element instanceof GEdge)) {
            element = index.findParentElement(elementId, toTypeGuard(GNode)) ?? index.findParentElement(elementId, toTypeGuard(GEdge));
        }
        if (element) {
            return index.findTaskOrTransition(element.id);
        }
        return undefined;
    }
}
