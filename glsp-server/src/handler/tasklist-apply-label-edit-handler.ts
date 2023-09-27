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
import { ApplyLabelEditOperation } from '@eclipse-glsp/protocol';
import { GLSPServerError, OperationHandler } from '@eclipse-glsp/server-node';
import { inject, injectable } from 'inversify';
import { TaskListModelState } from '../model/tasklist-model-state';

@injectable()
export class TaskListApplyLabelEditHandler implements OperationHandler {
    readonly operationType = ApplyLabelEditOperation.KIND;

    @inject(TaskListModelState)
    protected readonly modelState: TaskListModelState;

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
                task[propertyName] = operation.text;
                break;
            default:
                console.warn(`Unable to update task: property ${propertyName} is unknown`);
        }
    }
}
