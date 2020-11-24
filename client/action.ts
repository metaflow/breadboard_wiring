import Konva from 'konva';
import { error } from './utils';

export const actionDeserializers: { (data: any): (Action | null) }[] = [];

export function deserializeAction(data: any): Action {
    for (const d of actionDeserializers) {
        const a = d(data);
        if (a !== null) return a;
    }
    error('cannot deserialize action', data);
    throw new Error('cannot deserialize action');
}

export interface Action {
    begin(): void;
    apply(): void;
    undo(): void;
    mousemove(event: Konva.KonvaEventObject<MouseEvent>): boolean;
    mousedown(event: Konva.KonvaEventObject<MouseEvent>): boolean;
    mouseup(event: Konva.KonvaEventObject<MouseEvent>): boolean;
    cancel(): void;
    serialize(): any;
}
