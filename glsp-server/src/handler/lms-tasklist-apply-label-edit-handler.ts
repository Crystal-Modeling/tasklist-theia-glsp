import { ApplyLabelEditOperation } from '@eclipse-glsp/protocol';
import { GLSPServerError, Logger, OperationHandler } from '@eclipse-glsp/server-node';
import { inject, injectable } from 'inversify';
import { TaskListLmsClient } from '../lms/client/tasklist-lms-client';
import { TaskListModelState } from '../model/tasklist-model-state';

@injectable()
export class TaskListApplyLabelEditHandler implements OperationHandler {
    readonly operationType = ApplyLabelEditOperation.KIND;

    @inject(Logger)
    protected logger: Logger;

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
                if (task[propertyName] !== operation.text) {
                    this.lmsClient.updateTask(this.modelState.taskList.id, { id: task.id, [propertyName]: operation.text });
                } else {
                    this.logger.info('Label content does not differ from the model attribute');
                }
                break;
            default:
                this.logger.warn(`Unable to update task: property ${propertyName} is unknown`);
        }
    }
}
