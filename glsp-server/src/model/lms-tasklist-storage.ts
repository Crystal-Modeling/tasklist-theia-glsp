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
import { TaskList } from './tasklist-model';
import { TaskListModelState } from './tasklist-model-state';

@injectable()
export class TaskListStorage extends AbstractJsonModelStorage {
    @inject(TaskListLmsClient)
    private lmsClient: TaskListLmsClient;

    @inject(TaskListModelState)
    protected override modelState: TaskListModelState;

    loadSourceModel(action: RequestModelAction): MaybePromise<void> {
        const sourceUri = this.getSourceUri(action);
        const taskList = this.loadFromFile(sourceUri, TaskList.is);
        return taskList.then(resolvedModel => {
            this.modelState.taskList = resolvedModel;
        });
    }

    saveSourceModel(action: SaveModelAction): MaybePromise<void> {
        const sourceUri = this.getFileUri(action);
        this.writeFile(sourceUri, this.modelState.taskList);
    }

    /*
     * Copied and adapted from @eclipse-glsp abstract-json-model-storage
     */
    protected override async loadFromFile(sourceUri: string): Promise<unknown>;
    protected override async loadFromFile<T>(sourceUri: string, guard: TypeGuard<T>): Promise<T>;
    protected override async loadFromFile<T>(sourceUri: string, guard?: TypeGuard<T>): Promise<T | unknown> {
        try {
            const notationPath = this.toPath(sourceUri);
            let fileContent = this.readFile(notationPath);
            if (!fileContent) {
                const modelId = await this.lmsClient.getModelId(sourceUri);
                fileContent = this.createModelForEmptyFile(modelId);
            }
            if (guard && !guard(fileContent)) {
                throw new Error('The loaded root object is not of the expected type!');
            }
            return fileContent;
        } catch (error) {
            throw new GLSPServerError(`Could not load model from file: ${sourceUri}`, error);
        }
    }

    protected override createModelForEmptyFile(modelId: string): TaskList {
        return {
            id: modelId,
            tasks: [],
            transitions: []
        };
    }
}
