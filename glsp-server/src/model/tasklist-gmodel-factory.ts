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
import { GEdge, GGraph, GLabel, GModelFactory, GNode } from '@eclipse-glsp/server-node';
import { inject, injectable } from 'inversify';
import { Task, Transition } from './tasklist-model';
import { TaskListModelState } from './tasklist-model-state';

@injectable()
export class TaskListGModelFactory implements GModelFactory {
    @inject(TaskListModelState)
    protected modelState: TaskListModelState;

    createModel(): void {
        const taskList = this.modelState.taskList;
        this.modelState.index.indexTaskList(taskList);
        const childNodes = taskList.tasks.map(task => this.createTaskNode(task));
        const childEdges = taskList.transitions.map(transition => this.createTransitionEdge(transition));
        const newRoot = GGraph.builder() //
            .id(taskList.id)
            .addChildren(childNodes)
            .addChildren(childEdges)
            .build();
        this.modelState.updateRoot(newRoot);
    }

    protected createTaskNode(task: Task): GNode {
        // const name = GNode.builder()
        //     .layout('hbox')
        //     .addChildren(
        //         GNode.builder()
        //             .addCssClass('tasklist-node')
        //             .add(
        //                 GLabel.builder().text(task.name).id(`${task.id}_name`).addCssClass('name').addLayoutOption('hAlign', 'left')
        //                 .build()
        //             )
        //             .build(),
        //         GNode.builder().addCssClass('transparent-node').build()
        //     )
        //     .build();

        // const content = GNode.builder()
        //     .id(task.id)
        //     .addCssClass('tasklist-node')
        //     .add(GLabel.builder().text(task.content).addCssClass('content').build())
        //     .build();

        // const builder = GNode.builder()
        //     .addCssClass('transparent-node')
        //     .layout('vbox')
        //     .addChildren(name, content)
        //     .addLayoutOption('paddingLeft', 5)
        //     .position(task.position);
        const builder = GNode.builder()
            .id(task.id)
            .addCssClass('tasklist-node')
            .add(GLabel.builder().text(task.name).id(`${task.id}_name`).addCssClass('name').addLayoutOption('hAlign', 'left').build())
            .add(GLabel.builder().text(task.content).id(`${task.id}_label`).addCssClass('content').build())
            .layout('vbox')
            .addLayoutOption('paddingLeft', 5)
            .position(task.position);

        if (task.size) {
            builder.addLayoutOptions({ prefWidth: task.size.width, prefHeight: task.size.height });
        }

        return builder.build();
    }

    protected createTransitionEdge(transition: Transition): GEdge {
        return GEdge.builder() //
            .id(transition.id)
            .addCssClass('tasklist-transition')
            .sourceId(transition.sourceTaskId)
            .targetId(transition.targetTaskId)
            .build();
    }
}
