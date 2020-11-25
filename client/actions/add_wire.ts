import Konva from 'konva';
import { Wire, removeRedundantPoints, addHelperPoints, WirePointSpec } from '../components/wire';
import { Action, actionDeserializers } from '../action';
import { currentLayer, pointAsNumber, Point, PlainPoint, closesetContact } from '../workspace';
import { newAddress } from '../address';
import theme from '../../theme.json';

const marker = 'AddWireAction';

interface AddWireActionSpec {
    typeMarker: typeof marker;
    points: Konva.Vector2d[];
};

actionDeserializers.push(function (data: any): Action | null {
    if (data['typeMarker'] != marker) return null;
    return new AddWireAction(data);
});

export class AddWireAction extends Action {
    wire: Wire | null = null;
    line: Konva.Line|undefined;
    startMarker: Konva.Circle|undefined;
    endMarker: Konva.Circle|undefined;
    points: Point[] = [];

    constructor(spec?: AddWireActionSpec) {
        super();
        if (spec != null) {
            this.points = spec.points.map(p => new Point(p.x, p.y));
        }
    }
    begin() {
        super.begin();
        this.line = new Konva.Line({
            points: [],
            stroke: theme.active,
            strokeWidth: 3,
            lineCap: 'round',
            lineJoin: 'round',
        });
        this.startMarker = new Konva.Circle({
            radius: 1,
            fill: theme.active,
        });
        this.endMarker = new Konva.Circle({
            radius: 1,
            fill: theme.active,
        })
        if (this.points.length > 0) {
            this.startMarker.position(this.points[0]);
            this.endMarker.position(this.points[this.points.length - 1]);
        }
        currentLayer()?.add(this.line);
        currentLayer()?.add(this.startMarker);
        currentLayer()?.add(this.endMarker);
    }
    mouseup(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        return false;
    }
    apply() {
        super.apply();
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
        this.wire = new Wire();
        this.wire.id(newAddress());
        this.wire.pointsSpec(specs);
        this.wire.materialized(true);
        this.wire.show(currentLayer());
        this.removeHelpers();
    }
    removeHelpers() {
        this.line?.remove();
        this.startMarker?.remove();
        this.endMarker?.remove();
    }
    undo() {
        super.undo();
        if (this.wire == null) return;
        this.wire.materialized(false);
        this.wire.hide();
    }
    mousemove(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        this.endMarker?.position(Point.cursor().alignToGrid());
        if (this.points.length == 0) {
            this.startMarker?.position(Point.cursor().alignToGrid());
            return false;
        }
        this.updateLayout();
        return false;
    }
    updateLayout() {
        const pp: number[] = [];
        for (const xy of this.points) {
            pp.push(...pointAsNumber(xy));
        }
        const xy = Point.cursor().alignToGrid();
        pp.push(...pointAsNumber(xy));
        this.line?.points(pp);
    }
    orthogonalCursor(): Point {
        return Point.cursor().alignToGrid();
        /* TODO: inline
        const xy = Point.cursor().alignToGrid();
        if (this.points.length == 0) return xy;
        const last = this.points[this.points.length - 1];
        const d = xy.clone().sub(last);
        if (Math.abs(d.x) < Math.abs(d.y)) {
            xy.x = last.x;
        } else {
            xy.y = last.y;
        }
        return xy;
        */
    }
    mousedown(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        if (event.evt.button != 0) return true;
        const xy = this.orthogonalCursor();
        this.points.push(xy);
        const c = closesetContact(xy);
        // Complete action if clicked on contact.
        return (this.points.length >= 2 && c != null && c.absolutePosition().closeTo(xy));
    }
    cancel(): void {
        super.cancel();
        this.removeHelpers();
    }
    serialize() {
        const z: AddWireActionSpec = {
            typeMarker: marker,
            points: this.points.map(p => p.plain()),
        };
        return z;
    }
}