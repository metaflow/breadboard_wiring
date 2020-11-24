import { IntegratedCircuitSchematic } from "../components/IC_schematic";
import { Action, actionDeserializers } from "../action";
import { KonvaEventObject } from "konva/types/Node";
import { currentLayer, Point, PlainPoint } from "../workspace";
import { getTypedByAddress } from "../address";
import assertExists from "ts-assert-exists";
import { deserializeComponent, Component } from "../components/component";
import theme from '../../theme.json';

const marker = 'MoveIcSchematicAction';

actionDeserializers.push(function (data: any): Action | null {
  if (data['typeMarker'] !== marker) return null;
  const s: MoveIcSchematicActionSpec = data;
  const ic = assertExists(getTypedByAddress(IntegratedCircuitSchematic, s.ic_address));
  let z = new MoveIcSchematicAction(ic, new Point(s.from));
  z.to = new Point(s.to);
  return z;
});


interface MoveIcSchematicActionSpec {
  typeMarker: 'MoveIcSchematicAction';
  from: PlainPoint;
  to: PlainPoint;
  ic_address: string;
}

export class MoveIcSchematicAction implements Action {
    from: Point;
    to: Point;
    originalOffset: Point;
    ic: IntegratedCircuitSchematic;
    actionIc: Component;
    constructor(s: IntegratedCircuitSchematic, from?: Point) {
        if (from == undefined) from = Point.cursor();
        this.from = from;
        this.to = from;
        this.ic = s;
        this.originalOffset = this.ic.offset();
        this.actionIc = assertExists(deserializeComponent(s.serialize()));
        this.actionIc.mainColor(theme.active);
        this.ic.hide();
        this.actionIc.show(currentLayer());
    }
    apply(): void {
        const d = this.to.clone().sub(this.from);
        this.ic.offset(this.originalOffset.clone().add(d).alignToGrid());
        this.ic.updateLayout();
        this.ic.show(currentLayer());
        this.actionIc.hide();
    }
    undo(): void {
        this.ic.offset(this.originalOffset);
        this.ic.updateLayout();
    }
    mousemove(event: KonvaEventObject<MouseEvent>): boolean {
        this.to = Point.cursor();
        const d = this.to.clone().sub(this.from);
        let xy = this.originalOffset.clone().add(d).alignToGrid();
        this.actionIc.offset(xy);
        this.actionIc.updateLayout();
        return false;
    }
    mousedown(event: KonvaEventObject<MouseEvent>): boolean {
return false;
    }
    mouseup(event: KonvaEventObject<MouseEvent>): boolean {
        this.to = Point.cursor();
        return true;
    }
    cancel(): void {
        this.ic.show(currentLayer());
        this.actionIc.hide();
    }
    serialize() {
        const z: MoveIcSchematicActionSpec = {
            typeMarker: marker, 
            from: this.from.plain(),
            to: this.to.plain(),
            ic_address: this.ic.address(),   
        };
        return z;
    }
}