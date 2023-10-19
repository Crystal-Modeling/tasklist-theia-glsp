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
    configureDefaultModelElements,
    configureModelElement,
    ConsoleLogger,
    createClientContainer,
    DefaultTypes,
    Dimension,
    EditableLabel,
    editLabelFeature,
    LogLevel,
    overrideViewerOptions,
    SEdge,
    SLabel,
    SLabelView,
    TYPES
} from '@eclipse-glsp/client';
import 'balloon-css/balloon.min.css';
import { Container, ContainerModule } from 'inversify';
import '../css/diagram.css';
import { TaskListEdgeView } from './tasklist-views';

const taskListDiagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
    rebind(TYPES.LogLevel).toConstantValue(LogLevel.warn);
    const context = { bind, unbind, isBound, rebind };
    configureDefaultModelElements(context);
    configureModelElement(context, 'label:long', SLongLabel, SLabelView, { enable: [editLabelFeature] });
    configureModelElement(context, DefaultTypes.LABEL, SLabel, SLabelView, { enable: [editLabelFeature] });
    configureModelElement(context, DefaultTypes.EDGE, SEdge, TaskListEdgeView);
});

export default function createContainer(widgetId: string): Container {
    const container = createClientContainer(taskListDiagramModule);

    overrideViewerOptions(container, {
        baseDiv: widgetId,
        hiddenDiv: widgetId + '_hidden',
        needsClientLayout: true
    });

    return container;
}

class SLongLabel extends SLabel implements EditableLabel {
    editControlDimension: Dimension = { width: 250, height: 20 };
}
