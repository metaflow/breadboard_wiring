import Konva from 'konva';
import { Wire, removeRedundantPoints, addHelperPoints, WirePointSpec } from '../components/wire';
import { Action, actionDeserializers } from '../action';
import { actionLayer, defaultLayer, pointAsNumber, scale, PhysicalPoint, PlainPoint, closesetContact } from '../stage';
import { newAddress } from '../address';

const marker = 'AddWireAction';

interface AddWireActionSpec {
    typeMarker: typeof marker;
    points: Konva.Vector2d[];
};

actionDeserializers.push(function (data: any): Action | null {
    if (data['typeMarker'] != marker) return null;
    return new AddWireAction(data);
});

export class AddWireAction implements Action {
    wire: Wire | null = null;
    line: Konva.Line;
    startMarker: Konva.Circle;
    endMarker: Konva.Circle;
    points: PhysicalPoint[] = [];

    constructor(spec?: AddWireActionSpec) {
        this.line = new Konva.Line({
            points: [],
            stroke: 'red',
            strokeWidth: 3,
            lineCap: 'round',
            lineJoin: 'round',
        });
        this.startMarker = new Konva.Circle({
            radius: scale(),
            fill: 'red',
        });
        this.endMarker = new Konva.Circle({
            radius: scale(),
            fill: 'red',
        })
        if (spec != null) {
            this.points = spec.points.map(p => new PhysicalPoint(p.x, p.y));
            if (this.points.length > 0) {
                this.startMarker.position(this.points[0].screen());
                this.endMarker.position(this.points[spec.points.length - 1].screen());
            }
        }
        actionLayer()?.add(this.line);
        actionLayer()?.add(this.startMarker);
        actionLayer()?.add(this.endMarker);
    }
    mouseup(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        return false;
    }
    apply() {
        let specs: WirePointSpec[] = [];
        for (const p of this.points) {
            let s: WirePointSpec = {
                helper: false,
                offset: p.plain(),
            };
            specs.push(s);
        }
        specs = removeRedundantPoints(specs);
        specs = addHelperPoints(specs);
        this.wire = new Wire({
            id: newAddress(),
            offset: new PlainPoint(),
            points: specs,
        });
        this.wire.updateLayout();
        this.wire.materialized(true);
        this.wire.show(defaultLayer()); 
        this.removeHelpers();
    }
    removeHelpers() {
        this.line.remove();
        this.startMarker.remove();
        this.endMarker.remove();
    }
    undo() {
        if (this.wire == null) return;
        this.wire.materialized(false);
        this.wire.hide();
    }
    mousemove(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        this.endMarker.position(this.orthogonalCursor().screen());
        if (this.points.length == 0) {
            this.startMarker.position(this.orthogonalCursor().screen());
            return false;
        }
        this.updateLayout();
        return false;
    }
    updateLayout() {
        const pp: number[] = [];
        for (const xy of this.points) {
            pp.push(...pointAsNumber(xy.screen()));
        }
        const xy = this.orthogonalCursor();
        pp.push(...pointAsNumber(xy.screen()));
        this.line.points(pp);
    }
    orthogonalCursor(): PhysicalPoint {
        const xy = PhysicalPoint.cursor().alignToGrid();
        if (this.points.length == 0) return xy;
        const last = this.points[this.points.length - 1];
        const d = xy.clone().sub(last);
        if (Math.abs(d.getX()) < Math.abs(d.getY())) {
            xy.setX(last.getX());
        } else {
            xy.setY(last.getY());
        }
        return xy;
    }
    mousedown(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        if (event.evt.button != 0) return true;
        const xy = this.orthogonalCursor();
        this.points.push(xy);
        const c = closesetContact(xy);
        // Complete action if clicked on contact.
        return (this.points.length >=2 && c != null && c.absolutePosition().closeTo(xy));
    }
    cancel(): void {
        this.removeHelpers();
    }
    serialize() {
        const z: AddWireActionSpec = {
            typeMarker: marker,
            points: this.points.map(p => ({ x: p.getX(), y: p.getY() } as Konva.Vector2d)),
        };
        return z;
    }
}