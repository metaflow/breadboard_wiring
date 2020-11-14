import { Action, actionDeserializers, deserializeAction } from "../action";
import { KonvaEventObject } from "konva/types/Node";
import { actionLayer } from "../stage";

const marker = 'CompoundAction';

interface CompoundActionSpec {
    typeMarker: typeof marker;
    actions: any[];
};

actionDeserializers.push(function (data: any): Action | null {
    if (data['typeMarker'] != marker) return null;
    return new CompoundAction((data as CompoundActionSpec).actions.map(a => deserializeAction(a)));
});

export class CompoundAction implements Action {
    actions: Action[];
    done: boolean[];
    constructor(actions: Action[]) {        
        this.actions = actions;
        this.done = actions.map(_ => false);
    }
    apply(): void {
        this.actions.forEach(a => a.apply());
    }
    undo(): void {
        this.actions.reverse();
        this.actions.forEach(a => a.undo());
        this.actions.reverse();
    }
    mousemove(event: KonvaEventObject<MouseEvent>): boolean {
        const o = this;
        this.actions.forEach((a, i) => {
            if (o.done[i]) return;
            o.done[i] = a.mousemove(event);
        });
        return this.done.some(b => !b);
    }
    mousedown(event: KonvaEventObject<MouseEvent>): boolean {
        const o = this;
        this.actions.forEach((a, i) => {
            if (o.done[i]) return;
            o.done[i] = a.mousedown(event);
        });
        return this.done.some(b => !b);
    }
    mouseup(event: KonvaEventObject<MouseEvent>): boolean {
        const o = this;
        this.actions.forEach((a, i) => {
            if (o.done[i]) return;
            o.done[i] = a.mouseup(event);
        });
        return this.done.some(b => !b);
    }
    cancel(): void {
        this.actions.forEach(a => a.cancel());
    }
    serialize() {
        const z: CompoundActionSpec = {
            typeMarker: marker,
            actions: this.actions.map(a => a.serialize()),
        };
        return z;
    }
}