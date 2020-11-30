import Konva from 'konva';
import { removeRedundantPoints, addHelperPoints, WirePointSpec, Wire } from '../components/wire';
import { Interaction } from '../mutation';
import { currentLayer, pointAsNumber, Point, closesetContact, workspace } from '../workspace';
import theme from '../../theme.json';
import { AddComponentMutation } from './add_ic_action';

export class AddWireInteraction extends Interaction {
    line: Konva.Line | undefined;
    startMarker: Konva.Circle | undefined;
    endMarker: Konva.Circle | undefined;
    points: Point[] = [];
    constructor(p?: Point) {
        super();
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
        currentLayer()?.add(this.line);
        currentLayer()?.add(this.startMarker);
        currentLayer()?.add(this.endMarker);
        workspace.needsRedraw();
    }
    mousemove(event: Konva.KonvaEventObject<MouseEvent>): Interaction | null {
        this.endMarker?.position(Point.cursor().alignToGrid());
        if (this.points.length == 0) this.startMarker?.position(Point.cursor().alignToGrid());
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
        const xy = Point.cursor().alignToGrid();
        this.points.push(xy);
        const c = closesetContact(xy);
        this.updateLayout();
        // Complete action if clicked on contact.        
        if (this.points.length >= 2 && c != null && c.absolutePosition().closeTo(xy)) {
            this.complete();
            return null;
        }
        return this;
    }
    complete() {
        console.log('complete wire');
        this.removeHelpers();
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
        const wire = new Wire();
        wire.pointsSpec(specs);
        workspace.update(new AddComponentMutation(wire));
    }
    removeHelpers() {
        this.line?.remove();
        this.startMarker?.remove();
        this.endMarker?.remove();
        workspace.needsRedraw();
    }
    cancel(): void {
        this.removeHelpers();
    }
    updateLayout() {
        const pp: number[] = [];
        for (const xy of this.points) { // TODO: use spec points after optimization?
            pp.push(...pointAsNumber(xy));
        }
        const xy = Point.cursor().alignToGrid();
        pp.push(...pointAsNumber(xy));
        this.line?.points(pp);
        workspace.needsRedraw();
    }
}