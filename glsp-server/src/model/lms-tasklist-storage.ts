import {
    AbstractJsonModelStorage,
    ActionDispatcher,
    CenterAction,
    GLSPServerError,
    LayoutOperation,
    MaybePromise,
    ModelSubmissionHandler,
    Point,
    RequestModelAction,
    TypeGuard
} from '@eclipse-glsp/server-node';
import { inject, injectable } from 'inversify';
import { LmsSaveModelAction } from '../lms/action-protocol/model-saving';
import { TaskListLmsClient } from '../lms/client/tasklist-lms-client';
import { LmsConfiguration } from '../lms/lms-configuration';
import * as lms from '../lms/model';
import { Highlight, Save } from '../lms/model/actions';
import * as notation from '../notation/model';
import { Task, TaskList, Transition } from './tasklist-model';
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

    @inject(LmsConfiguration)
    protected lmsConfiguration: LmsConfiguration;

    public override async loadSourceModel(requestModelAction: RequestModelAction): Promise<void> {
        // TODO: This is in fact should be changed to `getNotationsUri()`
        const notationUri = this.getSourceUri(requestModelAction);
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
                if (this.lmsConfiguration.autolayouting) {
                    this.actionDispatcher.dispatchAfterNextUpdate(LayoutOperation.create([sourceModel.id]));
                }
            },
            action => {
                if (Highlight.is(action)) {
                    this.actionDispatcher.dispatch(CenterAction.create([action.id]));
                } else if (Save.is(action)) {
                    console.debug('Saving Model...');
                    // FIXME: When Save action is pushed together with ModelUpdate (i.e., deleting models marked for deletion),
                    // then notation is modified *after* it is saved with auto-layout
                    this.actionDispatcher.dispatch(LmsSaveModelAction.create({ persistNotation: true }));
                } else {
                    console.warn('Unknown action received', action);
                }
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
                reconciledSModel.tasks.push(Task.create(lmsTask, nTask.position, nTask.size));
            }
        }
        for (const lmsTask of unmappedLmsTasksById.values()) {
            reconciledSModel.tasks.push(Task.create(lmsTask, Point.ORIGIN));
        }

        for (const lmsTransition of lmsModel.transitions) {
            reconciledSModel.transitions.push(Transition.create(lmsTransition));
        }
        return reconciledSModel;
    }

    private combineLmsUpdateWithSourceModel(update: lms.RootUpdate, sourceModel: TaskList): TaskList {
        if (lms.ModelUpdate.is(update)) {
            console.debug('Updating the whole model');
            if (update.tasks) {
                if (update.tasks.removedIds) {
                    const idsToRemove = new Set(update.tasks.removedIds);
                    sourceModel.tasks = sourceModel.tasks.filter(t => !idsToRemove.has(t.id));
                }
                for (const newTask of update.tasks.added ?? []) {
                    sourceModel.tasks.push(Task.create(newTask, this.modelState.utilizeNewTaskCoordinates() ?? Point.ORIGIN));
                }
                for (const taskUpdate of update.tasks.changed ?? []) {
                    this.applyTaskUpdateToSourceModel(taskUpdate, sourceModel);
                }
            }
            if (update.transitions) {
                if (update.transitions.removedIds) {
                    const idsToRemove = new Set(update.transitions.removedIds);
                    sourceModel.transitions = sourceModel.transitions.filter(t => !idsToRemove.has(t.id));
                }
                for (const newTransition of update.transitions.added ?? []) {
                    sourceModel.transitions.push(Transition.create(newTransition));
                }
                for (const transitionUpdate of update.transitions.changed ?? []) {
                    this.applyTransitionUpdateToSourceModel(transitionUpdate, sourceModel);
                }
            }
        } else {
            if (lms.Task.isUpdate(update)) {
                console.debug('Updating an individual task');
                this.applyTaskUpdateToSourceModel(update, sourceModel);
            } else if (lms.Transition.isUpdate(update)) {
                console.debug('Updating an individual transition');
                this.applyTransitionUpdateToSourceModel(update, sourceModel);
            } else {
                console.warn('Unknown LMS Update, cannot be combined with the source model', update);
            }
        }
        return sourceModel;
    }

    private applyTaskUpdateToSourceModel(taskUpdate: lms.ElementUpdate<lms.Task>, sourceModel: TaskList): void {
        const sTask = sourceModel.tasks.find(t => t.id === taskUpdate.id);
        if (sTask) {
            let modified = false;
            if (taskUpdate.content) {
                sTask.content = taskUpdate.content;
                modified = true;
            }
            if (taskUpdate.name) {
                sTask.name = taskUpdate.name;
                modified = true;
            }
            if (taskUpdate.__state) {
                sTask.hidden = taskUpdate.__state === 'DISAPPEARED';
                let newPosition: Point | undefined;
                if (!sTask.hidden && (newPosition = this.modelState.utilizeNewTaskCoordinates())) {
                    sTask.position = newPosition;
                }
            }
            if (modified) {
                // NOTE: Updating the SourceTask GNode size to the default one to microlayout it automatically
                sTask.size = undefined;
            }
        }
    }

    private applyTransitionUpdateToSourceModel(transitionUpdate: lms.ElementUpdate<lms.Transition>, sourceModel: TaskList): void {
        const sTransition = sourceModel.transitions.find(t => t.id === transitionUpdate.id);
        if (sTransition) {
            if (transitionUpdate.sourceTaskId) {
                sTransition.sourceTaskId = transitionUpdate.sourceTaskId;
            }
            if (transitionUpdate.targetTaskId) {
                sTransition.targetTaskId = transitionUpdate.targetTaskId;
            }
            if (transitionUpdate.__state) {
                sTransition.hidden = transitionUpdate.__state === 'DISAPPEARED';
            }
        }
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

    public override saveSourceModel(action: LmsSaveModelAction): MaybePromise<void> {
        if (!action.persistNotation) {
            // NOTE: 1. Persisting source model remotely on LMS
            return this.lmsClient.persist(this.modelState.taskList.id);
        } else {
            // NOTE: 2. Persisting notation locally
            const sourceUri = this.getFileUri(action);
            this.writeFile(sourceUri, this.convertSModelToNotations(this.modelState.taskList));
        }
    }
}
