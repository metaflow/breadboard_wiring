import { IntegratedCircuitSchematic } from "../components/IC_schematic";
import { Mutation, actionDeserializers, ActionState } from "../mutation";
import { KonvaEventObject } from "konva/types/Node";
import { Point, PlainPoint, stage } from "../workspace";
import { all } from "../address";
import { Component } from "../components/component";
import { WirePoint } from "../components/wire";
import { selectionByType, selectionAddresses } from "../components/selectable_component";
import { Contact } from "../components/contact";
import { MoveWirePointAction } from "./move_wire_point";
import { MoveIcSchematicAction } from "./move_ic_schematic";
import assertExists from "ts-assert-exists";

const marker = 'MoveSelectionAction';

actionDeserializers.push(function (data: any, state: ActionState): Mutation | null {
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

export class MoveSelectionAction extends Mutation {
    from: Point;
    to: Point;
    moveICs: MoveIcSchematicAction[] = [];
    movePoints: MoveWirePointAction|undefined;
    selection: string[] = [];
    private constructor(from?: Point) {
        super();
        if (from == undefined) from = Point.cursor();
        this.from = from;
        this.to = from;        
    }
    begin() {
        super.begin();
        const points = selectionByType(WirePoint);
        const ics = selectionByType(IntegratedCircuitSchematic);
        const cc = ics.flatMap((c: Component) => c.descendants(Contact));
        const attached = all(WirePoint).filter((p: WirePoint) => {
            return cc.some((c: Contact) =>  c.absolutePosition().closeTo(p.absolutePosition()));
        });
        points.push(...(attached.filter((p: WirePoint) => points.indexOf(p) == -1)));
        this.movePoints = new MoveWirePointAction(points, this.from);
        this.movePoints.begin();
        for (const ic of ics) {
            const move = new MoveIcSchematicAction(ic, this.from);
            move.begin();
            this.moveICs.push(move);
        }
        this.selection = selectionAddresses();
        stage()!.container()!.setAttribute('style', 'cursor: move');
        // TODO: cancel should clear created actions?
    }
    cancel(): void {
        super.cancel();
        this.movePoints?.cancel();
        this.moveICs.forEach(a => a.cancel());
    }
    apply(): void {
        super.apply();
        assertExists(this.movePoints);
        this.movePoints!.to = this.to;
        this.movePoints?.apply();
        for (const a of this.moveICs) {
            a.to = this.to;
            a.apply();
        }
        stage()!.container()!.setAttribute('style', 'cursor: auto');
    }
    undo(): void {
        super.undo();
        this.movePoints?.undo();
        this.moveICs.forEach(a => a.undo());
    }
    mousemove(event: KonvaEventObject<MouseEvent>): boolean {
        this.to = Point.cursor();
        this.movePoints?.mousemove(event);
        for (const a of this.moveICs) a.mousemove(event);
        return false;
    }
    mousedown(event: KonvaEventObject<MouseEvent>): boolean {
        return false;
    }
    mouseup(event: KonvaEventObject<MouseEvent>): boolean {
        this.to = Point.cursor();
        this.movePoints?.mouseup(event);
        for (const a of this.moveICs) a.mouseup(event);
        return true;
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