import { ApplyLabelEditOperation } from '@eclipse-glsp/protocol';
import { GLSPServerError, OperationHandler } from '@eclipse-glsp/server-node';
import { inject, injectable } from 'inversify';
import { TaskListLmsClient } from '../lms/client/tasklist-lms-client';
import { TaskListModelState } from '../model/tasklist-model-state';

@injectable()
export class TaskListApplyLabelEditHandler implements OperationHandler {
    readonly operationType = ApplyLabelEditOperation.KIND;

    @inject(TaskListModelState)
    protected readonly modelState: TaskListModelState;

    @inject(TaskListLmsClient)
    protected readonly lmsClient: TaskListLmsClient;

    execute(operation: ApplyLabelEditOperation): void {
        const index = this.modelState.index;
        console.debug('Applying Label edit. Operation:', operation);
        const [taskId, propertyName] = operation.labelId.split('_', 2);
        const task = index.findTask(taskId);
        if (!task) {
            throw new GLSPServerError(`Could not retrieve the parent task for the label with id ${operation.labelId}`);
        }
        switch (propertyName) {
            case 'name':
            case 'content':
                this.lmsClient.updateTask(this.modelState.taskList.id, { id: task.id, [propertyName]: operation.text });
                // task[propertyName] = operation.text;
                break;
            default:
                console.warn(`Unable to update task: property ${propertyName} is unknown`);
        }
    }
}
