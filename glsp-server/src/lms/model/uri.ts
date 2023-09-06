export interface ModelUri {
    readonly modelUri: string;
}

export namespace ModelUri {
    export const root = '.';

    export function nested(...segments: Segment[]): string {
        return root + segments.join('');
    }

    export namespace Segment {
        export function property(propertyName: string): Segment {
            return ofValue('/' + propertyName);
        }

        export function id(idValue: string): Segment {
            return ofValue('#' + idValue);
        }

        function ofValue(value: string): Segment {
            return value as Segment;
        }
    }

    export type Segment = string & {
        __brand: 'segment';
    };
}
