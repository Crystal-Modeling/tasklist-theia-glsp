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
import { GModelIndex, TypeGuard, getOrThrow } from '@eclipse-glsp/server-node';
import { injectable } from 'inversify';
import { Task, TaskList, Transition } from './tasklist-model';

@injectable()
export class TaskListModelIndex extends GModelIndex {
    protected idToTaskListElements = new Map<string, Task | Transition>();

    indexTaskList(taskList: TaskList): void {
        this.idToTaskListElements.clear();
        for (const element of [...taskList.tasks, ...taskList.transitions]) {
            this.idToTaskListElements.set(element.id, element);
        }
    }

    /**
     * Returns TaskList SourceModel element by its id.
     *
     * @param elementId The id of the requested TaskList source model element.
     */
    getSModel<T extends Task | Transition>(elementId: string, typeGuard: TypeGuard<T>): T {
        return getOrThrow(this.findSModel(elementId, typeGuard), `Could not retrieve SModel element with id: '${elementId}'`);
    }

    findTask(id: string): Task | undefined {
        return this.findSModel(id, Task.is);
    }

    findTransition(id: string): Transition | undefined {
        return this.findSModel(id, Transition.is);
    }

    findTaskOrTransition(id: string): Task | Transition | undefined {
        return this.idToTaskListElements.get(id);
    }

    private findSModel<T extends Task | Transition>(id: string, typeGuard: TypeGuard<T>): T | undefined {
        const element = this.findTaskOrTransition(id);
        return typeGuard(element) ? element : undefined;
    }
}
