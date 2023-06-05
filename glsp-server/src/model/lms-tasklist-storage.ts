import {
    AbstractJsonModelStorage,
    GLSPServerError,
    MaybePromise,
    RequestModelAction,
    SaveModelAction,
    TypeGuard
} from '@eclipse-glsp/server-node';
import { inject, injectable } from 'inversify';
import { TaskListLmsClient } from '../lms/client/tasklist-lms-client';
import * as src from '../lms/model';
import { TaskList } from './tasklist-model';
import { TaskListModelState } from './tasklist-model-state';

@injectable()
export class TaskListStorage extends AbstractJsonModelStorage {
    @inject(TaskListLmsClient)
    private lmsClient: TaskListLmsClient;

    @inject(TaskListModelState)
    protected override modelState: TaskListModelState;

    public override async loadSourceModel(action: RequestModelAction): Promise<void> {
        const sourceUri = this.getSourceUri(action);
        const notations = await this.loadNotationsFromFile(sourceUri, TaskList.is);
        const sourceModel = await this.lmsClient.getModelById(notations.id);
        const sModel = this.reconcileNotationsWithSourceModel(notations, sourceModel);
        // After reconciliation, it is essential to save SModel -- it can get changed after reconciliation
        this.writeFile(sourceUri, sModel);
        this.modelState.taskList = sModel;
    }

    /*
     * Copied and adapted from @eclipse-glsp abstract-json-model-storage
     */
    private async loadNotationsFromFile<T>(sourceUri: string, guard: TypeGuard<T>): Promise<T> {
        try {
            const notationPath = this.toPath(sourceUri);
            let fileContent = this.readFile(notationPath);
            if (!fileContent) {
                const modelId = await this.lmsClient.getModelId(sourceUri);
                fileContent = this.createModelForEmptyFile(modelId);
            }
            if (!guard(fileContent)) {
                throw new Error('The loaded root object is not of the expected type!');
            }
            return fileContent;
        } catch (error) {
            throw new GLSPServerError(`Could not load model from file: ${sourceUri}`, error);
        }
    }

    private reconcileNotationsWithSourceModel(notations: TaskList, sourceModel: src.Model): TaskList {
        const reconciledSModel: TaskList = TaskList.create(notations.id);
        const unmappedTasksById: Map<string, src.Task> = new Map();
        sourceModel.tasks.forEach(t => unmappedTasksById.set(t.id, t));
        for (const nTask of notations.tasks) {
            const sourceTask = unmappedTasksById.get(nTask.id);
            if (sourceTask) {
                unmappedTasksById.delete(nTask.id);
                reconciledSModel.tasks.push({ ...sourceTask, position: nTask.position, size: nTask.size });
            }
        }
        for (const sourceTask of unmappedTasksById.values()) {
            reconciledSModel.tasks.push({ ...sourceTask, position: { x: 0, y: 0 } });
        }

        for (const sourceTransition of sourceModel.transitions) {
            reconciledSModel.transitions.push({ ...sourceTransition });
        }
        return reconciledSModel;
    }

    protected override createModelForEmptyFile(modelId: string): TaskList {
        return TaskList.create(modelId);
    }

    public override saveSourceModel(action: SaveModelAction): MaybePromise<void> {
        const sourceUri = this.getFileUri(action);
        this.writeFile(sourceUri, this.modelState.taskList);
    }
}
