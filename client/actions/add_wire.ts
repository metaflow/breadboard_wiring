import Konva from 'konva';
import { removeRedundantPoints, addHelperPoints, WirePointSpec, Wire, newWirePointSpec, attachPoints } from '../components/wire';
import { Interaction } from '../mutation';
import { schemeLayer, pointAsNumber, Point, closesetContact, workspace } from '../workspace';
import theme from '../../theme.json';
import { AddComponentMutation } from './add_ic_action';
import { UpdateWireSpecMutation } from './update_wire_spec';
import { all } from '../components/component';

export class AddWireInteraction extends Interaction {
    line: Konva.Line | undefined;
    startMarker: Konva.Circle | undefined;
    endMarker: Konva.Circle | undefined;
    points: Point[] = [];
    constructor(stageName: string, p?: Point) {
        super(stageName);
        if (p != null) this.points.push(p);
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
        // TODO: not scheme layer.
        schemeLayer().add(this.line);
        schemeLayer().add(this.startMarker);
        schemeLayer().add(this.endMarker);
        workspace.invalidateScene();
    }
    mousemove(event: Konva.KonvaEventObject<MouseEvent>): Interaction | null {
        this.endMarker?.position(Point.cursor(this.stageName).alignToGrid());
        if (this.points.length == 0) this.startMarker?.position(Point.cursor(this.stageName).alignToGrid());
        this.updateLayout();
        return this;
    }
    mousedown(event: Konva.KonvaEventObject<MouseEvent>): Interaction | null {
        if (event.evt.button != 0) {
            if (this.points.length >= 2) {
                this.complete();
                return null;
            }
            return this;
        }
        const xy = Point.cursor(this.stageName).alignToGrid();
        this.points.push(xy);
        const c = closesetContact(this.stageName, xy);
        this.updateLayout();
        // Complete action if clicked on contact.        
        if (this.points.length >= 2 && c != null && c.absolutePosition().closeTo(xy)) {
            this.complete();
            return null;
        }
        return this;
    }

    complete() {
        this.removeHelpers();
        const o = this;
        let existingWire: Wire | null = null;
        let specs: WirePointSpec[] = [];
        console.log(all(Wire));
        for (const w of all(Wire)) {
            if (existingWire != null) break;
            const a = w.points[0].absolutePosition();
            const b = w.points[w.points.length - 1].absolutePosition();
            const x = o.points[0];
            const y = o.points[o.points.length - 1];
            if (a.closeTo(x)) {
                specs = attachPoints(o.points, w.pointsSpec().reverse());
                existingWire = w;
                break;
            }
            if (b.closeTo(x)) {
                specs = attachPoints(o.points, w.pointsSpec());
                existingWire = w;
                break;
            }
            if (a.closeTo(y)) {
                specs = attachPoints(o.points.reverse(), w.pointsSpec().reverse());
                existingWire = w;
                break;
            }
            if (b.closeTo(y)) {
                specs = attachPoints(o.points.reverse(), w.pointsSpec());
                existingWire = w;
                break;
            }
        }
        if (existingWire == null) {
            specs = this.points.map(p => newWirePointSpec(p.plain(), false));
            specs = removeRedundantPoints(specs);
            specs = addHelperPoints(specs);
            const wire = new Wire();
            wire.pointsSpec(specs);
            workspace.update(new AddComponentMutation(wire.serialize()));
            return;
        }
        console.log('attach to existing wire');
        // TODO: make this point simplification in Wire.pointsSpec()?
        specs = removeRedundantPoints(specs);
        specs = addHelperPoints(specs);
        workspace.update(new UpdateWireSpecMutation(existingWire.address(), existingWire.pointsSpec(), specs));
    }
    removeHelpers() {
        this.line?.remove();
        this.startMarker?.remove();
        this.endMarker?.remove();
        workspace.invalidateScene();
    }
    cancel(): void {
        this.removeHelpers();
    }
    updateLayout() {
        const pp: number[] = [];
        for (const xy of this.points) { // TODO: use spec points after optimization?
            pp.push(...pointAsNumber(xy));
        }
        const xy = Point.cursor(this.stageName).alignToGrid();
        pp.push(...pointAsNumber(xy));
        this.line?.points(pp);
        workspace.invalidateScene();
    }
}