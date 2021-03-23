import Konva from 'konva';
import { WirePointSpec, Wire, newWirePointSpec, attachPoints } from '../components/wire';
import { Interaction } from '../mutation';
import { Point, workspace, stageLayer, layer, AreaName } from '../workspace';
import theme from '../../theme.json';
import { AddComponentMutation } from './add_component';
import { UpdateWireSpecMutation } from './update_wire_spec';
import { all } from '../components/component';

export class AddWireInteraction extends Interaction {
    line: Konva.Line | undefined;
    startMarker: Konva.Circle | undefined;
    endMarker: Konva.Circle | undefined;
    points: Point[] = [];
    constructor(stageName: AreaName, p?: Point) {
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
        const lr = layer(stageLayer(stageName));
        lr.add(this.line);
        lr.add(this.startMarker);
        lr.add(this.endMarker);
        workspace.invalidateScene();
    }
    mousemove(event: Konva.KonvaEventObject<MouseEvent>): Interaction | null {
        const c = this.area().alignedCursor();
        this.endMarker?.position(c);
        if (this.points.length == 0) this.startMarker?.position(c);
        this.updateLayout();
        return this;
    }
    mousedown(event: Konva.KonvaEventObject<MouseEvent>): Interaction | null {
        if (event.evt.button != 0) { // Not left click. TODO: maybe only right click?
            if (this.points.length >= 2) {
                this.complete();
                return null;
            }
            return this;
        }
        const xy = this.area().alignedCursor();
        this.points.push(xy);
        const c = this.area().closesetContact(xy);
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
            const wire = new Wire();
            wire.layerName(stageLayer(this.areaName));
            wire.pointsSpec(specs);
            workspace.update(new AddComponentMutation(wire.serialize()));
            return;
        }
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
        const pp: number[] = this.points.flatMap(z => z.array());
        const xy = this.area().alignedCursor();
        pp.push(...xy.array());
        this.line?.points(pp);
        workspace.invalidateScene();
    }
}