import Konva from 'konva';
import { pointAsNumber, Point, closesetContact, stage } from '../workspace';
import { newAddress } from '../address';
import { Component, componentDeserializers, ComponentSpec } from './component';
import { workspace } from '../workspace';
import { MoveWirePointAction } from '../actions/move_wire_point';
import { SelectableComponent } from './selectable_component';
import { MoveSelectionAction } from '../actions/move_selection';
import theme from '../../theme.json';
import { typeGuard } from '../utils';

export interface WirePointSpec extends ComponentSpec {
    helper: boolean;
}

const wirePointSize = 9;

/*
wire bending

points are:
- bend / helper (in the middle of straight fragment) / attached to something. That can be
modelled as "fixed" flag and "midpoint" (helper at the moment).
- wire has an "orthogonal" flag meaning that all bends must be 90 degrees
- editing of non-orthogonal wire is implemented and more or less straightforward as move of
  every point is independent
- moving points for orthogonal wire. First we move affected (selected) points and then look on
  adjusted points that were not affected:
  - bend -> middle: look through and if the next point is non-affected bend, then move this bend
    horizontally/vertically depending on wire direction between; if it is a fixed point - move
    middle point horizontally/vertically and consider it "affected";
  - middle -> any: add two bend points in between.

After moving all points in wire we should check wire self-intersections to remove "loops".
*/

export class WirePoint extends SelectableComponent {
    selectableInterface: true = true;
    selectionRect: Konva.Rect;
    visible: boolean = false; // TODO: ake visibility a port of component.
    _selected: boolean = false;
    helper: boolean;
    constructor(spec: WirePointSpec) {
        super(spec);
        this.helper = spec.helper;
        this.selectionRect = new Konva.Rect({
            name: 'selectable',
            strokeWidth: 0.5,
        });
        const point = this;
        this.selectionRect.on('mousedown', function (e) {
            if (workspace.currentAction()) {
                workspace.onMouseDown(e);
                return;
            }
            if (e.evt.button != 0) return;
            e.cancelBubble = true;
            if (point.selected()) {
                workspace.currentAction(new MoveSelectionAction());
            } else {
                workspace.currentAction(new MoveWirePointAction([point], Point.cursor()));
            }
        });
        this.selectionRect.on('mouseover mouseout', function (e: any) {
            const wire = point.parent();
            if (typeGuard(wire, Wire)) wire.onPointEvent(e.type);
        });
        this.shapes.add(this.selectionRect);
        this.updateLayout();
    }
    materialized(b?: boolean): boolean {
        let z = super.materialized(b);
        if (z) {
            this.selectionRect.attrs['address'] = this.address();
        }
        return z;
    }
    updateLayout() {
        super.updateLayout();
        const d = wirePointSize / 2;
        let xy = this.absolutePosition().sub(new Point(d, d));
        this.selectionRect.x(xy.x);
        this.selectionRect.y(xy.y);
        this.selectionRect.width(wirePointSize);
        this.selectionRect.height(wirePointSize);
        const c = closesetContact(this.absolutePosition());
        if (c == null || !c.absolutePosition().closeTo(this.absolutePosition())) {
            this.selectionRect.dash([0.5, 0.5]);
        } else {
            this.selectionRect.dash([]);
        }
        this.selectionRect.stroke(this._selected ? theme.selection : theme.helper);
        this.selectionRect.visible(this.visible);
    }
    wire(): Wire {
        return this.parent() as Wire;
    }
    serialize(): any {
        return {
            address: this.materialized() ? this.address() : undefined,
            helper: this.helper,
            offset: this._offset.plain(),
            id: this._id,
        } as WirePointSpec;
    }
}

const wireWidth = 1;

export interface WireSpec extends ComponentSpec {
    typeMarker: string;
    points: WirePointSpec[];
}

const marker = 'Wire';

componentDeserializers.push(function (data: any): (Wire | null) {
    if (data['typeMarker'] !== marker) {
        return null
    }
    return new Wire(data['spec'] as WireSpec);
});


export class Wire extends Component {
    line: Konva.Line;
    points: WirePoint[] = [];
    private hoverWire = false;
    private hoverPoint = false;
    alwaysShowPoints = false;
    constructor(spec?: WireSpec) {
        super(spec);
        this.line = new Konva.Line({
            points: [],
            strokeWidth: wireWidth,
            lineCap: 'round',
            lineJoin: 'round',
            hitStrokeWidth: 15,
        });
        const w = this;
        this.line.on('mouseover', function () {
            w.hoverWire = true;
            w.needsLayoutUpdate();
            workspace.redraw();
        });
        this.line.on('mouseout', function () {
            w.hoverWire = false;
            w.needsLayoutUpdate();
            workspace.redraw();
        });
        this.pointsSpec(spec?.points);
        this.shapes.add(this.line);
        this.updateLayout();
    }
    updateLayout() {
        const pp: number[] = [];
        for (const p of this.points) {
            if (p.helper) continue;
            pp.push(...pointAsNumber(p.absolutePosition()));
        }
        this.line.points(pp);
        this.line.strokeWidth(wireWidth);
        this.line.stroke(this.mainColor());
        for (const p of this.points) {
            p.visible = this.hoverWire || this.hoverPoint || this.alwaysShowPoints || p.selected();
        }
        super.updateLayout();
    }
    pointsSpec(v?: WirePointSpec[]): WirePointSpec[] {
        let o = this;
        if (v !== undefined) {
            this.hoverPoint = false;
            o.points.forEach(p => p.remove());
            // Create points in two passes: first with known IDs, then new ones.
            let pp = v.map(x => {
                if (x.id == undefined) return null;
                return o.addChild(new WirePoint(x));
            });
            for (let i = 0; i < v.length; i++) {
                const x = v[i];
                if (x.id !== undefined) continue;
                x.id = newAddress(o);
                pp[i] = o.addChild(new WirePoint(x));
            }
            o.points = [];
            pp.forEach(x => {
                if (x != null) o.points.push(x);
            });
            o.needsLayoutUpdate(true);
        }
        return o.points.map(p => p.serialize());
    }
    serialize(): any {
        return {
            typeMarker: marker,
            points: this.pointsSpec(),
            offset: this._offset.plain(),
            id: this._id,
        } as WireSpec;
    }
    onPointEvent(eventType: string) {
        this.hoverPoint = eventType == 'mouseover';
        this.needsLayoutUpdate();
        workspace.redraw();
    }
}

export function removeRedundantPoints(s: WirePointSpec[]): WirePointSpec[] {
    // Make sure that on every line there are 3 points.
    // Iterate over points and add to line.
    // If only two points: add intermediate one.
    // If 4+ points: remove all but one intermediate.
    if (s.length < 2) return s;
    let j = 1;
    const n = s.length;
    const keep = new Array<boolean>(n);
    keep[0] = true;
    keep[n - 1] = true;
    let pi = new Point(s[0].offset);
    while (j + 1 < n) {
        let pj = new Point(s[j].offset);
        let k = j + 1;
        const pk = new Point(s[k].offset);
        // pi -- pj -- pk
        const ji = pi.clone().sub(pj);
        const jk = pk.clone().sub(pj);
        if (ji.length() < 0.1 || jk.length() < 0.1) {
            j = k;
            continue;
        }
        const cosa = ji.dot(jk) / ji.length() / jk.length();
        if (cosa < -0.99) {
            j = k;
            continue;
        }
        keep[j] = true;
        pi = pj;
        j++;
    }
    const pp = s;
    s = [];
    for (let k = 0; k < keep.length; k++) {
        if (keep[k]) {
            s.push(pp[k]);
        }
    }
    return s
}

export function addHelperPoints(s: WirePointSpec[]): WirePointSpec[] {
    const z: WirePointSpec[] = [];
    for (let k = 0; k < s.length; k++) {
        if (k > 0) {
            z.push({
                offset: new Point(s[k - 1].offset).add(new Point(s[k].offset)).s(0.5).plain(),
                helper: true,
            });
        }
        z.push(s[k]);
    }
    return z;
}