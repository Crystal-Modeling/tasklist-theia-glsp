export interface Transition {
    id: string;
    sourceTaskId: string;
    targetTaskId: string;
}

export namespace Transition {
    export function is(obj: any): obj is Transition {
        return typeof obj.id === 'string' && typeof obj.sourceTaskId === 'string' && typeof obj.targetTaskId === 'string';
    }
}
