import { IntegratedCircuitSchematic } from "../components/IC_schematic";
import { Mutation, actionDeserializers, ActionState, MutationSpec } from "../mutation";
import { KonvaEventObject } from "konva/types/Node";
import { currentLayer, Point, PlainPoint } from "../workspace";
import { getTypedByAddress } from "../address";
import assertExists from "ts-assert-exists";
import { deserializeComponent, Component } from "../components/component";
import theme from '../../theme.json';

const marker = 'MoveIcSchematicAction';

actionDeserializers.push(function (data: any, state: ActionState): Mutation | null {
    if (data['typeMarker'] !== marker) return null;
    const s: MoveIcSchematicActionSpec = data;
    // TODO: that is not true when deserializing full history w/o applying.
    const ic = assertExists(getTypedByAddress(IntegratedCircuitSchematic, s.ic_address));
    let z = new MoveIcSchematicAction(ic, new Point(s.from));
    z.to = new Point(s.to);
    return z;
});


interface MoveIcSchematicActionSpec extends MutationSpec {
    typeMarker: 'MoveIcSchematicAction';
    from: PlainPoint;
    to: PlainPoint;
    ic_address: string;
}

export class MoveIcSchematicAction extends Mutation {
    from: Point | undefined;
    to: Point | undefined;
    originalOffset: Point;
    ic: IntegratedCircuitSchematic;
    actionIc: Component | null = null;
    private constructor(s: IntegratedCircuitSchematic, from?: Point) {
        super();
        this.from = from;
        this.to = from;
        this.ic = s;
        this.originalOffset = this.ic.offset();
    }
    begin() {
        super.begin();
        if (this.from == undefined) this.from = this.to = Point.cursor();
        this.actionIc = deserializeComponent(this.ic.serialize());
        // TODO: cancel should remove actionIc
        this.actionIc.mainColor(theme.active);
        this.ic.hide();
        this.actionIc.show(currentLayer());
    }
    cancel(): void {
        super.cancel();
        this.ic.show(currentLayer());
        this.actionIc?.remove();
        this.actionIc = null;
    }
    apply(): void {
        super.apply();
        const d = this.to?.clone().sub(this.from!)!;
        this.ic.offset(this.originalOffset.clone().add(d).alignToGrid());
        this.ic.updateLayout();
        this.ic.show(currentLayer());
        this.actionIc?.hide();
    }
    undo(): void {
        super.undo();
        this.ic.offset(this.originalOffset);
        this.ic.updateLayout();
    }
    mousemove(event: KonvaEventObject<MouseEvent>): boolean {
        this.to = Point.cursor();
        const d = this.to.clone().sub(this.from!);
        let xy = this.originalOffset.clone().add(d).alignToGrid();
        this.actionIc?.offset(xy);
        this.actionIc?.updateLayout();
        return false;
    }
    mousedown(event: KonvaEventObject<MouseEvent>): boolean {
        return false;
    }
    mouseup(event: KonvaEventObject<MouseEvent>): boolean {
        this.to = Point.cursor();
        return true;
    }
    serialize() {
        const z: MoveIcSchematicActionSpec = {
            typeMarker: marker,
            from: this.from!.plain(),
            to: this.to!.plain(),
            ic_address: this.ic.address(),
        };
        return z;
    }
}