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

import { AnyObject, Dimension, Point, hasArrayProp, hasObjectProp, hasStringProp } from '@eclipse-glsp/server-node';
import type * as lms from '../lms/model';

/**
 * The source model for `tasklist` GLSP diagrams. A `TaskList` is a
 * plain JSON objects that contains a set of {@link Task tasks} and {@link Transition transitions}.
 */
export interface TaskList {
    id: string;
    tasks: Task[];
    transitions: Transition[];
}

export namespace TaskList {
    export function is(object: unknown): object is TaskList {
        return AnyObject.is(object) && hasStringProp(object, 'id') && hasArrayProp(object, 'tasks');
    }

    export function create(semanticId: string): TaskList {
        return {
            id: semanticId,
            tasks: [],
            transitions: []
        };
    }
}

export interface SourceElement {
    id: string;
    hidden?: boolean;
}

export function visible<T extends SourceElement>(elements: T[]): T[] {
    return elements.filter(el => !el.hidden);
}

export interface Task extends SourceElement {
    name: string;
    content: string;
    position: { x: number; y: number };
    size?: { width: number; height: number };
}

export namespace Task {
    export function is(object: unknown): object is Task {
        return (
            AnyObject.is(object) &&
            hasStringProp(object, 'id') &&
            hasStringProp(object, 'name') &&
            hasStringProp(object, 'content') &&
            hasObjectProp(object, 'position')
        );
    }

    export function create(lmsTask: lms.Task, position: Point, size?: Dimension): Task {
        return {
            ...lmsTask,
            position,
            size
        };
    }
}

export interface Transition extends SourceElement {
    sourceTaskId: string;
    targetTaskId: string;
}

export namespace Transition {
    export function is(object: unknown): object is Transition {
        return (
            AnyObject.is(object) &&
            hasStringProp(object, 'id') &&
            hasStringProp(object, 'sourceTaskId') &&
            hasStringProp(object, 'targetTaskId')
        );
    }

    export function create(lmsTransition: lms.Transition): Transition {
        return { ...lmsTransition };
    }
}
