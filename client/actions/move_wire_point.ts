import { Action, actionDeserializers } from '../action';
import Konva from 'konva';
import { actionLayer, defaultLayer, PhysicalPoint, PlainPoint } from '../stage';
import { Wire, WirePoint, WirePointSpec, removeRedundantPoints, addHelperPoints } from '../components/wire';
import { getByAddress, copy, all } from '../address';
import assertExists from 'ts-assert-exists';
import { selectionAddresses } from '../components/selectable_component';
import { Contact } from '../components/contact';

const marker = 'MoveWirePointAction';

actionDeserializers.push(function (data: any): Action | null {
  if (data['typeMarker'] !== marker) return null;
  const s: MoveWirePointActionSpec = data;
  let z = new MoveWirePointAction(s.points.map(a => getByAddress(a)), new PhysicalPoint(s.from));
  z.selection = s.selection;
  z.to = new PhysicalPoint(s.to);
  return z;
});

interface MoveWirePointActionSpec {
  typeMarker: 'MoveWirePointAction';
  points: string[];
  from: PlainPoint;
  to: PlainPoint;
  states: SingleWireMove[];
  selection: string[];
}

interface SingleWireMove {
  address: string;
  originalPoints: WirePointSpec[];
  affectedPointsIds: (string|undefined)[];
  auxWire?: Wire;
};

function moveSingleWire(dxy: PhysicalPoint, s: SingleWireMove): WirePointSpec[] {
  const w = assertExists(s.auxWire);
  let z: WirePointSpec[] = [];
  w.points.forEach(p => p.remove());
  const affected: boolean[] = [];
  const fixed: boolean[] = [];
  const nextVertical: boolean[] = [];
  const nextHorizontal: boolean[] = [];
  const contacts = all(Contact);
  for (const p of s.originalPoints) {
    const a = s.affectedPointsIds.indexOf(assertExists(p.id)) != -1;
    if (p.helper && !a) continue;
    affected.push(a);
    fixed.push(contacts.some(c => c.absolutePosition().closeTo(new PhysicalPoint(p.offset))));
    z.push(copy(p));
  }
  for (let i = 0; i < z.length; i++) {
    if (i + 1 < z.length) {
      nextVertical.push(z[i].offset.x == z[i + 1].offset.x);
      nextHorizontal.push(z[i].offset.y == z[i + 1].offset.y);
    }
    if (affected[i]) {
      z[i].offset = new PhysicalPoint(z[i].offset).add(dxy).alignToGrid().plain();
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

export class MoveWirePointAction implements Action {
  states: SingleWireMove[] = [];
  affectedPointsAddresses: string[];
  from: PhysicalPoint;
  to: PhysicalPoint;
  selection: string[];
  constructor(points: WirePoint[], origin?: PhysicalPoint) {
    this.selection = selectionAddresses();
    this.affectedPointsAddresses = points.map(p => p.address());
    const uniqAdresses = Array.from(new Set<string>(points.map(p => p.parent()?.address()!)));
    for (const a of uniqAdresses) {
      const w = getByAddress(a) as Wire;
      const s: SingleWireMove = {
        address: w.address(),
        originalPoints: w.pointsSpec(),
        affectedPointsIds: [],
        auxWire: new Wire(),
      };
      for (const p of points) {
        if (p.parent() == w) {
          s.affectedPointsIds.push(p.id());
        }
      }
      this.states.push(s);
      s.auxWire?.pointsSpec(w.pointsSpec());
      w.hide();
      s.auxWire?.show(actionLayer());
    }
    if (origin === undefined) origin = PhysicalPoint.cursor();
    this.from = origin;
    this.to = origin;
  }
  serialize() {
    const z: MoveWirePointActionSpec = {
      typeMarker: marker,
      points: this.affectedPointsAddresses,
      from: this.from.plain(),
      to: this.to.plain(),
      states: this.states,
      selection: this.selection,
    };
    return z;
  }
  apply(): void {
    const dxy = this.to.clone().sub(this.from);
    for (const s of this.states) {
      const w = getByAddress(s.address) as Wire;
      let x = moveSingleWire(dxy, s);
      w.pointsSpec(x);
      w.show(defaultLayer());
      s.auxWire?.hide();
    }
  }
  undo(): void {
    for (const w of this.states) {
      (getByAddress(w.address) as Wire).pointsSpec(w.originalPoints);
    }
    selectionAddresses(this.selection);
  }
  mousemove(event: Konva.KonvaEventObject<MouseEvent>): boolean {
    this.to = PhysicalPoint.cursor();
    const dxy = this.to.clone().sub(this.from);
    for (const s of this.states) {
      const sp = moveSingleWire(dxy, s);
      s.auxWire?.pointsSpec(sp);
    } 
    return false;
  }
  mousedown(event: Konva.KonvaEventObject<MouseEvent>): boolean {
    return false;
  }
  mouseup(event: Konva.KonvaEventObject<MouseEvent>): boolean {
    this.to = PhysicalPoint.cursor(); // TODO: cursor().physical() instead.
    return true;
  }
  cancel(): void {
    this.undo();
  }
}