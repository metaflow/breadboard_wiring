import { IntegratedCircuitSchematic } from "../components/IC_schematic";
import { Action, actionDeserializers } from "../action";
import { KonvaEventObject } from "konva/types/Node";
import { Point, PlainPoint, stage } from "../stage";
import { all } from "../address";
import { Component } from "../components/component";
import { WirePoint } from "../components/wire";
import { selectionByType, selectionAddresses } from "../components/selectable_component";
import { Contact } from "../components/contact";
import { MoveWirePointAction } from "./move_wire_point";
import { MoveIcSchematicAction } from "./move_ic_schematic";

const marker = 'MoveSelectionAction';

actionDeserializers.push(function (data: any): Action | null {
    if (data['typeMarker'] !== marker) return null;
    const s: MoveSelectionActionSpec = data;
    let z = new MoveSelectionAction(new Point(s.from));
    z.selection = s.selection;
    z.to = new Point(s.to);
    return z;
});

interface MoveSelectionActionSpec {
    typeMarker: 'MoveSelectionAction';
    from: PlainPoint;
    to: PlainPoint;
    selection: string[];
}

export class MoveSelectionAction implements Action {
    from: Point;
    to: Point;
    moveICs: MoveIcSchematicAction[] = [];
    movePoints: MoveWirePointAction;
    selection: string[];
    constructor(from?: Point) {
        if (from == undefined) from = Point.cursor();
        this.from = from;
        this.to = from;
        const points = selectionByType(WirePoint);
        const ics = selectionByType(IntegratedCircuitSchematic);
        const cc = ics.flatMap((c: Component) => c.descendants(Contact));
        const attached = all(WirePoint).filter((p: WirePoint) => {
            return cc.some((c: Contact) =>  c.absolutePosition().closeTo(p.absolutePosition()));
        });
        points.push(...(attached.filter((p: WirePoint) => points.indexOf(p) == -1)));
        this.movePoints = new MoveWirePointAction(points, from);
        for (const ic of ics) {
            this.moveICs.push(new MoveIcSchematicAction(ic, from));
        }
        this.selection = selectionAddresses();
        stage()!.container()!.setAttribute('style', 'cursor: move');
    }
    apply(): void {
        this.movePoints.to = this.to;
        this.movePoints.apply();
        for (const a of this.moveICs) {
            a.to = this.to;
            a.apply();
        }
        stage()!.container()!.setAttribute('style', 'cursor: auto');
    }
    undo(): void {
        this.movePoints.undo();
        this.moveICs.forEach(a => a.undo());
    }
    mousemove(event: KonvaEventObject<MouseEvent>): boolean {
        this.to = Point.cursor();
        this.movePoints.mousemove(event);
        for (const a of this.moveICs) a.mousemove(event);
        return false;
    }
    mousedown(event: KonvaEventObject<MouseEvent>): boolean {
        return false;
    }
    mouseup(event: KonvaEventObject<MouseEvent>): boolean {
        this.to = Point.cursor();
        this.movePoints.mouseup(event);
        for (const a of this.moveICs) a.mouseup(event);
        return true;
    }
    cancel(): void {
        this.movePoints.cancel();
        this.moveICs.forEach(a => a.cancel());
    }
    serialize() {
        const z: MoveSelectionActionSpec = {
            typeMarker: marker,
            from: this.from.plain(),
            to: this.to.plain(),
            selection: this.selection,
        };
        return z;
    }
}