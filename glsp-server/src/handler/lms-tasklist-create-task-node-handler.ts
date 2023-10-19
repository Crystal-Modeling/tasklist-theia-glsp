import { CreateNodeOperation, CreateNodeOperationHandler, DefaultTypes, Point } from '@eclipse-glsp/server-node';
import { inject, injectable } from 'inversify';
import { TaskListLmsClient } from '../lms/client/tasklist-lms-client';
import * as lms from '../lms/model';
import { Task } from '../model/tasklist-model';
import { TaskListModelState } from '../model/tasklist-model-state';

@injectable()
export class TaskListCreateTaskHandler extends CreateNodeOperationHandler {
    readonly elementTypeIds = [DefaultTypes.NODE];

    @inject(TaskListModelState)
    protected override modelState: TaskListModelState;

    @inject(TaskListLmsClient)
    protected lmsClient: TaskListLmsClient;

    execute(operation: CreateNodeOperation): void {
        console.debug('Creating task. Operation:', operation);
        const coordinates = this.getRelativeLocation(operation) ?? this.getLocation(operation) ?? Point.ORIGIN;
        this.modelState.newTaskCoordinates = coordinates;
        const task: lms.Creation<lms.Task> = {
            name: 'taskName',
            content: 'Lorem Ipsum'
        };
        const anchor = this.findAnchorTask(coordinates);
        this.lmsClient.createTask(this.modelState.taskList.id, task, anchor?.id);
    }

    get label(): string {
        return 'Task';
    }

    private findAnchorTask(coordinates: Point): Task | undefined {
        let anchor: Task | undefined = undefined;

        for (const task of this.modelState.taskList.tasks) {
            if (more(task.position, coordinates)) {
                if (!anchor || !more(task.position, anchor.position)) {
                    anchor = task;
                }
            }
        }

        return anchor;
    }
}

/**
 * Implements mathematical expression {left} > {right}
 * A point is considered to be "more" than the other, if it is either located below, or on the same Y level,
 *  but more to the right than the other point
 * @param left left argument of an expression
 * @param right right argument of an expression
 * @returns `true` if left point has bigger metric than the right point
 */
function more(left: Point, right: Point): boolean {
    if (left.y < right.y) {
        return false;
    }
    if (left.y > right.y) {
        return true;
    }
    return left.x > right.x;
}
