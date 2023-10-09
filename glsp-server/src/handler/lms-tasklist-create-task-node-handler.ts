/********************************************************************************
 * Copyright (c) 2022 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import { CreateNodeOperation, CreateNodeOperationHandler, DefaultTypes, Point } from '@eclipse-glsp/server-node';
import { inject, injectable } from 'inversify';
import { TaskListLmsClient } from '../lms/client/tasklist-lms-client';
import * as lms from '../lms/model';
import { TaskListModelState } from '../model/tasklist-model-state';

@injectable()
export class TaskListCreateTaskHandler extends CreateNodeOperationHandler {
    readonly elementTypeIds = [DefaultTypes.NODE];

    @inject(TaskListModelState)
    protected override modelState: TaskListModelState;

    @inject(TaskListLmsClient)
    protected lmsClient: TaskListLmsClient;

    execute(operation: CreateNodeOperation): void {
        const coordinates = this.getRelativeLocation(operation) ?? this.getLocation(operation) ?? Point.ORIGIN;
        this.modelState.newTaskCoordinates = coordinates;
        const task: lms.Creation<lms.Task> = {
            name: 'taskName',
            content: 'Lorem Ipsum'
        };
        this.lmsClient.createTask(this.modelState.taskList.id, task);
    }

    get label(): string {
        return 'Task';
    }
}
