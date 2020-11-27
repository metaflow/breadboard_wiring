import Konva from 'konva';
import { Wire, removeRedundantPoints, addHelperPoints, WirePointSpec, WireSpec } from '../components/wire';
import { Mutation, actionDeserializers, ActionState } from '../mutation';
import { currentLayer, pointAsNumber, Point, PlainPoint, closesetContact } from '../workspace';
import { newAddress } from '../address';
import theme from '../../theme.json';
import { deserializeComponent } from '../components/component';
import assertExists from 'ts-assert-exists';
import { assert } from '../utils';

const marker = 'AddWireAction';

interface AddWireActionSpec {
    typeMarker: typeof marker;
    wire: any;
};

actionDeserializers.push(function (data: any, state: ActionState): Mutation | null {
    if (data['typeMarker'] != marker) return null;
    const a = new AddWireAction(data);
    a.wire = deserializeComponent(data.wire) as Wire;
    return a;
});

export class AddWireAction extends Mutation {
    wire: Wire | null = null;
    line: Konva.Line | undefined;
    startMarker: Konva.Circle | undefined;
    endMarker: Konva.Circle | undefined;
    points: Point[] = [];

    private constructor(p?: Point) {
        super();
        if (p != null) this.points.push(p);
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
        assert(this.wire == null);
        this.wire = new Wire();
        this.wire.id(newAddress());
        this.updateLayout();
    }
    mouseup(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        return false;
    }
    apply() {
        super.apply();
        this.wire!.materialized(true);
        this.wire!.show(currentLayer());
        this.removeHelpers();
    }
    cancel(): void {
        super.cancel();
        this.removeHelpers();
        this.wire!.materialized(false);
        this.wire!.hide();
    }
    removeHelpers() {
        this.line?.remove();
        this.startMarker?.remove();
        this.endMarker?.remove();
        this.wire!.show
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
        this.wire!.pointsSpec(specs);

        const pp: number[] = [];
        for (const xy of this.points) { // TODO: use spec points?
            pp.push(...pointAsNumber(xy));
        }
        const xy = Point.cursor().alignToGrid();
        pp.push(...pointAsNumber(xy));
        this.line?.points(pp);
    }
    mousedown(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        if (event.evt.button != 0) return this.points.length >= 2;
        const xy = Point.cursor().alignToGrid();
        this.points.push(xy);
        const c = closesetContact(xy);
        this.updateLayout();
        // Complete action if clicked on contact.        
        return (this.points.length >= 2 && c != null && c.absolutePosition().closeTo(xy));
    }
    serialize() {
        const z: AddWireActionSpec = {
            typeMarker: marker,
            wire: assertExists(this.wire).serialize(),
        };
        return z;
    }
}