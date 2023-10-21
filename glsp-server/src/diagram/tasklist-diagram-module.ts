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
import {
    ActionHandlerConstructor,
    ComputedBoundsActionHandler,
    DiagramConfiguration,
    DiagramModule,
    GModelFactory,
    GModelIndex,
    InstanceMultiBinding,
    LabelEditValidator,
    ModelState,
    ModelValidator,
    OperationHandlerConstructor,
    SourceModelStorage
} from '@eclipse-glsp/server-node';
import { BindingTarget, applyBindingTarget } from '@eclipse-glsp/server-node/lib/di/binding-target';
import { injectable, interfaces } from 'inversify';
import { LmsAutolayoutActionHandler } from '../handler/lms-config-action-handler';
import { LmsModelValidator } from '../handler/lms-model-validator';
import { TaskListApplyLabelEditHandler } from '../handler/lms-tasklist-apply-label-edit-handler';
import { TaskListCreateTaskHandler } from '../handler/lms-tasklist-create-task-node-handler';
import { TaskListCreateTransitionHandler } from '../handler/lms-tasklist-create-transition-handler';
import { TaskListDeleteElementHandler } from '../handler/lms-tasklist-delete-element-handler';
import { TaskListReconnectEdgeHandler } from '../handler/lms-tasklist-reconnect-edge-handler';
import { TaskListChangeBoundsHandler } from '../handler/tasklist-change-bounds-handler';
import { TaskListLabelEditValidator } from '../handler/tasklist-label-edit-validator';
import { TaskListLayoutOperationHandler } from '../layout/lms-tasklist-layout-operation-handler';
import { LmsClient } from '../lms/client/lms-client';
import { TaskListLmsClient } from '../lms/client/tasklist-lms-client';
import { TaskListStorage } from '../model/lms-tasklist-storage';
import { TaskListGModelFactory } from '../model/tasklist-gmodel-factory';
import { TaskListModelIndex } from '../model/tasklist-model-index';
import { TaskListModelState } from '../model/tasklist-model-state';
import { TaskListDiagramConfiguration } from './tasklist-diagram-configuration';

@injectable()
export class TaskListDiagramModule extends DiagramModule {
    readonly diagramType = 'tasklist-diagram';

    protected override configure(
        bind: interfaces.Bind,
        unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        rebind: interfaces.Rebind
    ): void {
        super.configure(bind, unbind, isBound, rebind);
        const context = { bind, isBound };
        // NOTE: Apply LMS specific bindings
        context.bind(TaskListLmsClient).toSelf().inSingletonScope();
        applyBindingTarget(context, LmsClient, { service: TaskListLmsClient }).inSingletonScope();
    }

    protected bindDiagramConfiguration(): BindingTarget<DiagramConfiguration> {
        return TaskListDiagramConfiguration;
    }

    protected bindSourceModelStorage(): BindingTarget<SourceModelStorage> {
        return TaskListStorage;
    }

    protected bindModelState(): BindingTarget<ModelState> {
        return { service: TaskListModelState };
    }

    protected bindGModelFactory(): BindingTarget<GModelFactory> {
        return TaskListGModelFactory;
    }

    protected override configureActionHandlers(binding: InstanceMultiBinding<ActionHandlerConstructor>): void {
        super.configureActionHandlers(binding);
        binding.add(ComputedBoundsActionHandler);
        binding.add(LmsAutolayoutActionHandler);
    }

    protected override configureOperationHandlers(binding: InstanceMultiBinding<OperationHandlerConstructor>): void {
        super.configureOperationHandlers(binding);
        // NOTE: LayoutOperationHandler handler is already bound in newer versions of DiagramModule (e.g., 1.1.0-next)
        binding.add(TaskListLayoutOperationHandler);
        // binding.add(LayoutOperationHandler);
        binding.add(TaskListCreateTaskHandler);
        binding.add(TaskListCreateTransitionHandler);
        binding.add(TaskListChangeBoundsHandler);
        binding.add(TaskListApplyLabelEditHandler);
        binding.add(TaskListReconnectEdgeHandler);
        binding.add(TaskListDeleteElementHandler);
    }

    protected override bindGModelIndex(): BindingTarget<GModelIndex> {
        this.context.bind(TaskListModelIndex).toSelf().inSingletonScope();
        return { service: TaskListModelIndex };
    }

    protected override bindLabelEditValidator(): BindingTarget<LabelEditValidator> | undefined {
        return TaskListLabelEditValidator;
    }

    protected override bindModelValidator(): BindingTarget<ModelValidator> | undefined {
        return LmsModelValidator;
    }
}
