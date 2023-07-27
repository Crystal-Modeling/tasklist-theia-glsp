import {
    AbstractJsonModelStorage,
    ActionDispatcher,
    CenterAction,
    GLSPServerError,
    LayoutOperation,
    MaybePromise,
    ModelSubmissionHandler,
    RequestModelAction,
    SaveModelAction,
    TypeGuard
} from '@eclipse-glsp/server-node';
import { inject, injectable } from 'inversify';
import { TaskListLmsClient } from '../lms/client/tasklist-lms-client';
import * as lms from '../lms/model';
import * as notation from '../notation/model';
import { TaskList } from './tasklist-model';
import { TaskListModelState } from './tasklist-model-state';

@injectable()
export class TaskListStorage extends AbstractJsonModelStorage {
    @inject(TaskListLmsClient)
    private lmsClient: TaskListLmsClient;

    @inject(TaskListModelState)
    protected override modelState: TaskListModelState;

    @inject(ModelSubmissionHandler)
    protected submissionHandler: ModelSubmissionHandler;

    @inject(ActionDispatcher)
    protected actionDispatcher: ActionDispatcher;

    public override async loadSourceModel(action: RequestModelAction): Promise<void> {
        // TODO: This is in fact should be changed to `getNotationsUri()`
        const notationUri = this.getSourceUri(action);
        const notations = await this.loadNotationsFromFile(notationUri, notation.TaskList.is);
        const lmsModel = await this.lmsClient.getModelById(notations.id);
        const sourceModel = this.combineNotationsWithLmsModel(notations, lmsModel);
        // NOTE: After combination, it is essential to save round-tripped Notation -- it can get changed
        this.writeFile(notationUri, this.convertSModelToNotations(sourceModel));
        this.modelState.taskList = sourceModel;

        // Subscribing to the source model changes
        this.lmsClient.subscribeToModelChanges(
            notations.id,
            update => {
                console.debug('Received an update from the server', update);
                this.modelState.taskList = this.combineLmsUpdateWithSourceModel(update, sourceModel);
                this.actionDispatcher.dispatchAll(this.submissionHandler.submitModel());
                this.actionDispatcher.dispatchAfterNextUpdate(LayoutOperation.create([sourceModel.id]));
            },
            rename => {
                console.debug('Received a rename from the server', rename);
                this.modelState.taskList = this.combineLmsUpdateWithSourceModel(
                    { id: notations.id, tasks: { changed: [{ id: rename.id, name: rename.name }] } },
                    sourceModel
                );
                this.actionDispatcher.dispatchAll(this.submissionHandler.submitModel());
                this.actionDispatcher.dispatchAfterNextUpdate(LayoutOperation.create([rename.id]));
            },
            highlight => {
                this.actionDispatcher.dispatch(CenterAction.create([highlight.id]));
            }
        );
    }

    /*
     * Copied and adapted from @eclipse-glsp abstract-json-model-storage
     */
    private async loadNotationsFromFile<T>(notationsUri: string, guard: TypeGuard<T>): Promise<T> {
        try {
            const notationPath = this.toPath(notationsUri);
            let fileContent = this.readFile(notationPath);
            if (!fileContent) {
                const modelId = await this.lmsClient.getModelId(notationsUri);
                fileContent = this.createModelForEmptyFile(modelId);
            }
            if (!guard(fileContent)) {
                throw new Error('The loaded root object is not of the expected type!');
            }
            return fileContent;
        } catch (error) {
            throw new GLSPServerError(`Could not load model from file: ${notationsUri}`, error);
        }
    }

    // NOTE: Consider putting combination logic into a separate component
    private combineNotationsWithLmsModel(notations: notation.TaskList, lmsModel: lms.Model): TaskList {
        const reconciledSModel: TaskList = TaskList.create(notations.id);
        const unmappedLmsTasksById: Map<string, lms.Task> = new Map();
        lmsModel.tasks.forEach(t => unmappedLmsTasksById.set(t.id, t));
        for (const nTask of notations.tasks) {
            const lmsTask = unmappedLmsTasksById.get(nTask.id);
            if (lmsTask) {
                unmappedLmsTasksById.delete(nTask.id);
                reconciledSModel.tasks.push({ ...lmsTask, position: nTask.position, size: nTask.size });
            }
        }
        for (const lmsTask of unmappedLmsTasksById.values()) {
            reconciledSModel.tasks.push({ ...lmsTask, position: { x: 0, y: 0 } });
        }

        for (const lmsTransition of lmsModel.transitions) {
            reconciledSModel.transitions.push({ ...lmsTransition });
        }
        return reconciledSModel;
    }

    private combineLmsUpdateWithSourceModel(update: lms.ModelUpdate, sourceModel: TaskList): TaskList {
        if (update.tasks) {
            console.debug('Updating tasks');
            if (update.tasks.removedIds) {
                const idsToRemove = new Set(update.tasks.removedIds);
                console.debug('Going to remove', update.tasks.removedIds);
                sourceModel.tasks = sourceModel.tasks.filter(t => !idsToRemove.has(t.id));
                console.debug('Tasks after removal', sourceModel.tasks);
            }
            for (const newTask of update.tasks.added ?? []) {
                sourceModel.tasks.push({ ...newTask, position: { x: 0, y: 0 } });
            }
            for (const taskUpdate of update.tasks.changed ?? []) {
                const sTask = sourceModel.tasks.find(t => t.id === taskUpdate.id);
                if (sTask) {
                    if (taskUpdate.content) {
                        sTask.content = taskUpdate.content;
                    }
                    if (taskUpdate.name) {
                        sTask.name = taskUpdate.name;
                    }
                }
            }
        }
        if (update.transitions) {
            if (update.transitions.removedIds) {
                const idsToRemove = new Set(update.transitions.removedIds);
                sourceModel.transitions = sourceModel.transitions.filter(t => !idsToRemove.has(t.id));
            }
            for (const newTransition of update.transitions.added ?? []) {
                sourceModel.transitions.push({ ...newTransition });
            }
            for (const transitionUpdate of update.transitions.changed ?? []) {
                const sTask = sourceModel.transitions.find(t => t.id === transitionUpdate.id);
                if (sTask) {
                    if (transitionUpdate.sourceTaskId) {
                        sTask.sourceTaskId = transitionUpdate.sourceTaskId;
                    }
                    if (transitionUpdate.targetTaskId) {
                        sTask.targetTaskId = transitionUpdate.targetTaskId;
                    }
                }
            }
        }
        return sourceModel;
    }

    private convertSModelToNotations(sModel: TaskList): notation.TaskList {
        const notations = notation.TaskList.create(sModel.id);
        for (const sTask of sModel.tasks) {
            notations.tasks.push({ id: sTask.id, position: sTask.position, size: sTask.size });
        }
        return notations;
    }

    protected override createModelForEmptyFile(modelId: string): TaskList {
        return TaskList.create(modelId);
    }

    public override saveSourceModel(action: SaveModelAction): MaybePromise<void> {
        const sourceUri = this.getFileUri(action);
        // NOTE: Since so far no change is propagated to LMS, only Notation needs to be saved
        this.writeFile(sourceUri, this.convertSModelToNotations(this.modelState.taskList));
    }
}
