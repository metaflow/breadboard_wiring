import Konva from 'konva';
import { Contact } from './components/contact';
import { addAddressRoot, roots } from './address';
import { Component, deserializeComponent } from './components/component';
import { selection, selectionAddresses } from './components/selectable_component';
import { assert, error, typeGuard } from './utils';
import { Action, deserializeAction } from './action';
import { diffString } from 'json-diff';
import { SelectAction } from './actions/select_action';

let _stage: Konva.Stage | null = null;
let _gridAlignment: number | null = null;

export class PlainPoint {
    x: number = 0;
    y: number = 0;
};

// just in case: https://stackoverflow.com/questions/34098023/typescript-self-referencing-return-type-for-static-methods-in-inheriting-classe?rq=1
export class Point implements Konva.Vector2d {
    x: number = 0;
    y: number = 0;
    constructor(v?: number | Point | PlainPoint | null, y?: number) {
        if (v == null) v = 0;
        if (v instanceof Point) {
            this.x = v.x;
            this.y = v.y;
            return;
        }
        const a = v as any;
        if (a.x != null && a.y != null) {
            this.x = a.x;
            this.y = a.y;
            return;
        }
        if (typeof v === 'number') {
            this.x = v;
        } else {
            error(v, 'is not a valid init value for point');
        }
        if (y == undefined) y = 0;
        this.y = y;
    }
    align(a: number | null): this {
        if (a == null) return this;
        this.x = Math.round(this.x / a) * a;
        this.y = Math.round(this.y / a) * a;
        return this;
    }
    clone(): this {
        return new (this.constructor as any)(this.x, this.y);
    }
    s(v: number): this {
        this.x = this.x * v;
        this.y = this.y * v;
        return this;
    }
    sub(other: this): this {
        this.x = this.x - other.x;
        this.y = this.y - other.y;
        return this;
    }
    add(other: this): this {
        this.x = this.x + other.x;
        this.y = this.y + other.y;
        return this;
    }
    // Can be removed?
    plain() {
        return { x: this.x, y: this.y } as PlainPoint;
    }
    distance(other: this): number {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    closeTo(other: this): boolean {
        return this.distance(other) < 0.1;
    }
    atan2(): number {
        return Math.atan2(this.x, this.y);
    }
    dot(o: this): number {
        return this.x * o.x + this.y * o.y;
    }
    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    static screenCursor(): Point {
        let pos = stage().getPointerPosition()
        if (pos == null) pos = { x: 0, y: 0 };
        return new Point(stage().getPointerPosition());
    }
    static cursor(): Point {
        let pos = stage().getPointerPosition()
        if (pos == null) pos = { x: 0, y: 0 };
        return new Point(currentLayer()?.getTransform().copy().invert().point(pos));
    }
    alignToGrid(): this {
        return this.align(gridAlignment());
    }
};

export function gridAlignment(v?: number | null): number | null {
    if (v !== undefined) _gridAlignment = v;
    return _gridAlignment;
}

export function stage(s?: Konva.Stage): Konva.Stage {
    if (s !== undefined) _stage = s;
    if (_stage == null) {
        error('stage is not set');
        throw new Error("Stage is not set");
    }
    return _stage;
}

export function pointAsNumber(xy: Point): [number, number] { // TODO: move to Point(if used).
    return [xy.x, xy.y];
}

const contacts = new Map<string, Contact>();
export function addContact(c: Contact) {
    contacts.set(c.address(), c);
}

export function removeContact(c: Contact) {
    contacts.delete(c.address());
}

export function closesetContact(xy?: Point): Contact | null {
    if (xy === undefined) {
        xy = Point.cursor();
    }
    let z: Contact | null = null;
    let dz = 0;
    contacts.forEach(c => {
        const d = c.absolutePosition().distance(xy!);
        if (z == null || d < dz) {
            z = c;
            dz = d;
        }
    });
    return z;
}

let _defaultLayer: Konva.Layer | null;
export function currentLayer(layer?: Konva.Layer): Konva.Layer | null {
    if (layer !== undefined) {
        _defaultLayer = layer;
        layer.setAttr('name', 'default');
    }
    return _defaultLayer;
}

export interface StageState {
    roots: any[] | undefined;
    selection: string[] | undefined;
}

interface WorkspaceState {
    components: StageState | undefined;
    history: any[] | undefined;
    view: any | undefined;
}

interface ViewState {
    scale: number;
    offset: PlainPoint;
}

export class Workspace {
    private draggingScene = false;
    private draggingOrigin = new Point();
    private initialOffset = new Point();
    private debugActions = false;
    private _current: Action | null = null;
    private history: Action[] = [];
    private forwardHistory: Action[] = [];
    private loading = false;
    stateHistory: StageState[] = [];
    persistTimeout: number | undefined;
    constructor() {
        this.stateHistory.push(this.componentsState());
    }
    currentAction(a?: Action | null): Action | null {
        if (a !== undefined) {                       
            if (a != null) {
                assert(this._current==null);                
                a?.begin();
                this.redraw();
            }
            this._current = a;
        }
        return this._current;
    }
    onMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
        e.evt.preventDefault(); // Disable scroll on middle button click. TODO: check button?
        if (this.currentAction() != null) {
            if (this.currentAction()?.mousedown(e)) {
                this.commitAction();
            } else {
                this.redraw();
            }
            return;
        }
        // Left button.
        if (e.evt.button == 0) {
            const a = new SelectAction();
            workspace.currentAction(a);
            a.mousedown(e);
        }
        // Right click: deselect all.
        if (e.evt.button == 2 && selection().length > 0) {
            const a = new SelectAction();
            workspace.currentAction(a);
            workspace.commitAction();
        }
        // Middle button.
        if (e.evt.button == 1) { 
            this.draggingScene = true;
            this.draggingOrigin = Point.screenCursor();
            this.initialOffset = new Point(currentLayer()?.offsetX(), currentLayer()?.offsetY());
        }
    }
    onMouseUp(event: Konva.KonvaEventObject<MouseEvent>) {
        if (this.currentAction() != null) {
            if (this.currentAction()?.mouseup(event)) {
                this.commitAction();
            } else {
                this.redraw();
            }
            return true;
        }
        this.draggingScene = false;
        return true;
    }
    onMouseWheel(e: Konva.KonvaEventObject<WheelEvent>) {
        let d = (e.evt.deltaY < 0) ? (1 / 1.1) : 1.1;
        let x = currentLayer()?.scaleX();
        if (!x) return;
        let c = Point.cursor();
        x *= d;
        currentLayer()?.scaleX(x);
        currentLayer()?.scaleY(x);
        currentLayer()?.offset(c.sub(Point.cursor()).add(new Point(currentLayer()?.offset())));
        this.redraw();
        workspace.delayedPersistInLocalHistory();
    }
    onMouseMove(event: Konva.KonvaEventObject<MouseEvent>) {
        if (this.currentAction() != null) {
            if (this.currentAction()?.mousemove(event)) {
                this.commitAction();
            } else {
                this.redraw();
            }
            return;
        }
        if (this.draggingScene) {
            const sx = currentLayer()?.scaleX();
            if (!sx) return true;
            let p = Point.screenCursor().sub(this.draggingOrigin).s(-1 / sx).add(this.initialOffset);
            currentLayer()?.offset(p);
            this.redraw();
            workspace.delayedPersistInLocalHistory();
        }
    }
    commitAction(keepForwardHistory: boolean = false) {
        const a = this.currentAction();
        if (a == null) return;
        this.history.push(a);
        if (!keepForwardHistory) this.forwardHistory = [];
        this.currentAction(null);
        if (this.debugActions) {
            console.groupCollapsed(`applying ${a.constructor.name}`);
            // console.log('action', a);
            a.apply();
            assert(a.state=='applied');
            let sa = this.stateHistory[this.stateHistory.length - 1];
            let sb = this.componentsState();
            this.stateHistory.push(sb);
            a.undo();
            assert(a.state=='ready');
            let s = this.componentsState();
            if (JSON.stringify(sa) != JSON.stringify(s)) {
                error('undo changes state');
                console.group('details');
                console.log(diffString(sa, s));
                console.log('expected state', sa);
                console.log('actual state', s);
                console.groupEnd();
            }
            a.apply();
            assert(a.state == 'applied');
            s = this.componentsState();
            if (JSON.stringify(sb) != JSON.stringify(s)) {
                error('redo changes state');
                console.group('details');
                console.log('diff', diffString(sb, s));
                console.log('expected state', sb);
                console.log('actual state', s);
                console.groupEnd();
            }
            console.log('new state', this.componentsState());
            console.groupEnd();
        } else {
            // console.log(`applying ${a.constructor.name}`);
            a.apply();
            assert(a.state == 'applied');
        }
        this.redraw();
        this.persistInLocalHistory();
    }
    undo() {
        let a = this.history.pop();
        if (a == null) return;
        if (this.debugActions) {
            console.groupCollapsed(`undo action ${a.constructor.name}`);
            // State history is [..., sa, sb], we will end up in [..., sa].
            let sb = this.stateHistory.pop();
            let sa = this.stateHistory[this.stateHistory.length - 1];
            // console.log('action', a);
            a.undo();
            assert(a.state == 'ready');
            let s = this.componentsState();
            if (JSON.stringify(sa) != JSON.stringify(s)) {
                console.groupEnd();
                error('undo state does not match recorded');
                console.group('details');
                console.log('diff', diffString(sa, s));
                console.log('expected state', sa);
                console.log('actual state', s);
            }
            a.apply();
            assert(a.state == 'applied');
            s = this.componentsState();
            if (JSON.stringify(sb) != JSON.stringify(s)) {
                console.groupEnd();
                error('redo state does not match');
                console.group('details');
                console.log('diff', diffString(sb, s));
                console.log('expected state', sb);
                console.log('actual state', s);
            }
            a.undo();
            assert(a.state == 'ready');
            console.log('new state', this.componentsState());
            console.groupEnd();
        } else {
            console.log(`undo action ${a.constructor.name}`)
            a.undo();
            assert(a.state == 'ready');
        }
        this.forwardHistory.push(a);
        this.redraw();
    }
    redo() {
        this.cancelCurrentAction();
        this.currentAction(this.forwardHistory.pop());
        this.commitAction(true);
    }
    cancelCurrentAction() {
        const a = this.currentAction();
        if (a != null) {
            a.cancel();
            assert(a.state == 'cancelled');
            this.redraw();
        }
        this.currentAction(null);
    }
    persistInLocalHistory() {
        if (this.loading) return;
        localStorage.setItem('actions_history', JSON.stringify(this.serialize()));
    }
    private delayedPersistInLocalHistory() {
        window.clearTimeout(this.persistTimeout);
        const w = this;
        this.persistTimeout = window.setTimeout(function () {
            w.persistInLocalHistory();
        }, 500);
    }
    loadFromLocalHistory() {
        this.loading = true;
        let s = localStorage.getItem("actions_history");
        if (s === null) return;
        this.deserialize(JSON.parse(s));
        this.loading = false;
    }
    serializeActions(): any[] {
        let h: any[] = [];
        for (const a of this.history) {
            const s = a.serialize();
            if (s == null) continue;
            h.push(s);
        }
        return h;
    }
    deserialize(s: any) {
        console.log('load workspace', s);
        // TODO: make it a "reset or clear".
        this.history = [];
        this.forwardHistory = []; // TODO: store forward history too.
        this.stateHistory = [];
        this.clearComponents();
        document.title = 'scheme';
        const ws = s as WorkspaceState;
        if (ws.components !== undefined && ws.components.roots != null && (ws.history === undefined || !this.debugActions)) {
            ws.components.roots.forEach((a: any) => {
                const c = deserializeComponent(a);
                c.show(currentLayer());
                c.materialized(true);
            });
            selectionAddresses(s.selection);
            console.log(this.componentsState(), currentLayer());
        }
        this.stateHistory.push(this.componentsState());
        if (ws.history != undefined) {                        
            const h = ws.history.map(d => deserializeAction(d, this.debugActions ? 'ready' : 'applied'));
            if (this.debugActions) {
                console.groupCollapsed('load actions');
                // TODO: catch all browser errors.
                h.forEach(a => {
                    this.currentAction(a);
                    this.commitAction();
                });
                console.groupEnd();
            } else {
                this.history = h;
            }
        }
        // TODO: make currentLayer() assert instead of returning null.
        if (ws.view != undefined) {
            currentLayer()?.offset(ws.view.offset);
            currentLayer()?.scaleX(ws.view.scale);
            currentLayer()?.scaleY(ws.view.scale);
        }
        this.redraw();
    }
    componentsState(): StageState {
        let z: StageState = {
            roots: [],
            selection: selectionAddresses(),
        }
        const keys = Array.from(roots.keys());
        keys.sort().forEach(k => {
            z.roots?.push((roots.get(k) as Component).serialize());
        });
        return z;
    }
    serialize(): WorkspaceState {
        return {
            components: this.componentsState(),
            history: this.serializeActions(),
            // TODO: forward history too?
            view: this.serializeView(),
        };
    }
    private serializeView(): ViewState {
        return {
            scale: currentLayer()?.scaleX()!,
            offset: currentLayer()?.offset()!,
        }
    }
    private clearComponents() {
        roots.forEach(v => {
            if (typeGuard(v, Component)) {
                v.remove();
            } else {
                error(v, 'is not a component cannot delete');
            }
        })
    }
    redraw() {
        roots.forEach(v => {
            if (typeGuard(v, Component)) {
                if (v.needsLayoutUpdate()) v.updateLayout();
            }
        });
        stage().batchDraw();
    }
}


export let workspace = new Workspace();