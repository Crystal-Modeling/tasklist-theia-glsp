import { OperationHandler, ReconnectEdgeOperation } from '@eclipse-glsp/server-node';
import { inject, injectable } from 'inversify';
import type * as lms from 'src/lms/model';
import { TaskListLmsClient } from '../lms/client/tasklist-lms-client';
import { TaskListModelState } from '../model/tasklist-model-state';

@injectable()
export class TaskListReconnectEdgeHandler implements OperationHandler {
    readonly operationType = ReconnectEdgeOperation.KIND;

    @inject(TaskListModelState)
    protected readonly modelState: TaskListModelState;

    @inject(TaskListLmsClient)
    protected readonly lmsClient: TaskListLmsClient;

    execute(operation: ReconnectEdgeOperation): void {
        console.debug('Applying edge reconnection. Operation:', operation);
        const index = this.modelState.index;
        const transition = index.findTransition(operation.edgeElementId);
        if (!transition) {
            throw new Error(`Transition for edge ID ${operation.edgeElementId} not found`);
        }
        const modification: lms.Modification<lms.Transition> = { id: transition.id };

        if (transition.sourceTaskId !== operation.sourceElementId) {
            const source = index.findTask(operation.sourceElementId);
            if (!source) {
                throw new Error(`Task for source ID ${operation.sourceElementId} not found`);
            }
            modification.sourceTaskId = source.id;
            // transition.sourceTaskId = source.id;
        }
        if (transition.targetTaskId !== operation.targetElementId) {
            const target = index.findTask(operation.targetElementId);
            if (!target) {
                throw new Error(`Task for target ID ${operation.targetElementId} not found`);
            }
            modification.targetTaskId = target.id;
            // transition.targetTaskId = target.id;
        }
        this.lmsClient.updateTransition(this.modelState.taskList.id, modification);
    }
}
