import Konva from 'konva';
import { pointAsNumber, Point, closesetContact, stage, PlainPoint } from '../workspace';
import { all, copy, newAddress } from '../address';
import { Component, componentDeserializers, ComponentSpec } from './component';
import { workspace } from '../workspace';
import { SelectableComponent, selectionAddresses } from './selectable_component';
import theme from '../../theme.json';
import { typeGuard } from '../utils';
import { Contact } from './contact';
import assertExists from 'ts-assert-exists';
import { MoveSelectionInteraction } from '../actions/move_selection';
import { UpdateSelectionMutation } from '../actions/select';

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
            if (workspace.currentInteraction()) {
                workspace.onMouseDown(e);
                return;
            }
            if (e.evt.button != 0) return;
            e.cancelBubble = true;
            if (!point.selected()) {
                workspace.update(new UpdateSelectionMutation(selectionAddresses(), [point.address()]));
            }
            new MoveSelectionInteraction();
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
        const z = super.serialize() as WirePointSpec;
        z.helper = this.helper;
        return z;
    }
}

export function newWirePointSpec(p: PlainPoint, helper: boolean): WirePointSpec {
    return {
        T: WirePoint.name,
        helper: helper,
        offset: p,
    };
}

const wireWidth = 1;

export interface WireSpec extends ComponentSpec {
    points: WirePointSpec[];
}

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
            w.invalidateLayout();
        });
        this.line.on('mouseout', function () {
            w.hoverWire = false;
            w.invalidateLayout();
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
        if (v !== undefined) {
            this.hoverPoint = false;
            this.points.forEach(p => p.remove());
            // Create points in two passes: first with known IDs, then new ones.
            const o = this;
            let pp = v.map(x => {
                if (x.id == undefined) return null;
                return o.addChild(new WirePoint(x));
            });
            for (let i = 0; i < v.length; i++) {
                const x = v[i];
                if (x.id !== undefined) continue;
                x.id = newAddress(o);
                pp[i] = this.addChild(new WirePoint(x));
            }
            this.points = [];
            pp.forEach(x => {
                if (x != null) o.points.push(x);
            });
            this.invalidateLayout();
        }
        return this.points.map(p => p.serialize());
    }
    serialize(): any {
        const z = super.serialize() as WireSpec;
        z.points = this.pointsSpec();
        return z;
    }
    onPointEvent(eventType: string) {
        this.hoverPoint = eventType == 'mouseover';
        this.invalidateLayout();
        workspace.invalidateScene();
    }
}

componentDeserializers.set(Wire.name, function (data: any): Wire {
    return new Wire(data);
});

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
            z.push(newWirePointSpec(
                new Point(s[k - 1].offset).add(new Point(s[k].offset)).s(0.5).plain(),
                true,
            ));
        }
        z.push(s[k]);
    }
    return z;
}

export function attachPoints(points: Point[], spec: WirePointSpec[]): WirePointSpec[] {
    points.forEach((p: Point) => {
        spec.push(newWirePointSpec(p.plain(), false));
    });
    return spec;
}

interface SingleWireMove {
    address: string;
    originalPoints: WirePointSpec[];
    affectedPointsIds: (string|undefined)[];
    auxWire?: Wire;
};

export function moveSingleWire(dxy: Point, spec: WirePointSpec[], affectedIds: string[]): WirePointSpec[] {
    let z: WirePointSpec[] = [];
    const affected: boolean[] = [];
    const fixed: boolean[] = [];
    const nextVertical: boolean[] = [];
    const nextHorizontal: boolean[] = [];
    const contacts = all(Contact);
    for (const p of spec) {
      const a = affectedIds.indexOf(assertExists(p.id)) != -1;
      if (p.helper && !a) continue;
      affected.push(a);
      fixed.push(contacts.some(c => c.absolutePosition().closeTo(new Point(p.offset))));
      z.push(copy(p));
    }
    for (let i = 0; i < z.length; i++) {
      if (i + 1 < z.length) {
        nextVertical.push(z[i].offset.x == z[i + 1].offset.x);
        nextHorizontal.push(z[i].offset.y == z[i + 1].offset.y);
      }
      if (affected[i]) {
        z[i].offset = new Point(z[i].offset).add(dxy).alignToGrid().plain();
      }
    }
    for (let i = 0; i < z.length; i++) {
      const p = z[i];
      if (!affected[i] || p.helper) continue;
      if (i > 0 && !affected[i - 1] && !fixed[i - 1]) {
        if (nextVertical[i - 1]) {
          z[i - 1].offset.x = p.offset.x;
        }
        if (nextHorizontal[i - 1]) {
          z[i - 1].offset.y = p.offset.y;
        }
      }
      if (i + 1 < z.length && !affected[i + 1] && !fixed[i + 1]) {
        if (nextVertical[i]) {
          z[i + 1].offset.x = p.offset.x;
        }
        if (nextHorizontal[i]) {
          z[i + 1].offset.y = p.offset.y;
        }
      }
    }
    for (const p of z) {
      p.helper = false;
    }
    z = removeRedundantPoints(z);
    z = addHelperPoints(z);
    return z;
  }