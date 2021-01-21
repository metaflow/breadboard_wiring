import Konva from 'konva';
import { Contact } from './components/contact';
import { all, Component, deserializeComponent, resetIdCounter, roots } from './components/component';
import { selectionAddresses } from './components/selectable_component';
import { error } from './utils';
import { Mutation, Interaction, deserializeMutation } from './mutation';
import { diffString } from 'json-diff';
import { SelectInteraction, UpdateSelectionMutation } from './actions/select';

let _schemeStage: Konva.Stage | null = null;
let _physicalStage: Konva.Stage | null = null;
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
        let pos = schemeStage().getPointerPosition();
        if (pos == null) pos = { x: 0, y: 0 };
        return new Point(schemeStage().getPointerPosition());
    }
    static cursor(): Point {
        let pos = schemeStage().getPointerPosition();
        if (pos == null) pos = { x: 0, y: 0 };
        return new Point(schemeLayer().getTransform().copy().invert().point(pos));
    }
    alignToGrid(): this {
        return this.align(gridAlignment());
    }
};

export function gridAlignment(v?: number | null): number | null {
    if (v !== undefined) _gridAlignment = v;
    return _gridAlignment;
}

export function schemeStage(s?: Konva.Stage): Konva.Stage {
    if (s !== undefined) _schemeStage = s;
    if (_schemeStage == null) {
        error('stage is not set');
        throw new Error("Stage is not set");
    }
    return _schemeStage;
}

export function physicalStage(s?: Konva.Stage): Konva.Stage {
    if (s !== undefined) _physicalStage = s;
    if (_physicalStage == null) {
        error('stage is not set');
        throw new Error("Stage is not set");
    }
    return _physicalStage;
}

export function pointAsNumber(xy: Point): [number, number] { // TODO: move to Point(if used).
    return [xy.x, xy.y];
}

export function closesetContact(xy?: Point): Contact | null {
    if (xy === undefined) {
        xy = Point.cursor();
    }
    let z: Contact | null = null;
    let dz = 0;
    all(Contact).forEach((c: Contact) => {
        const d = c.absolutePosition().distance(xy!);
        if (z == null || d < dz) {
            z = c;
            dz = d;
        }
    });
    return z;
}

let layers = new Map<string, Konva.Layer>();
export function layer(name: string, v?: Konva.Layer): Konva.Layer {
    if (v !== undefined) {
        layers.set(name, v);
        return v;
    }
    const x = layers.get(name);
    if (x) return x;
    throw error(`no layer ${name}`);
}

export function schemeLayer(v?: Konva.Layer): Konva.Layer {
    return layer('scheme', v);
}

export function physicalLayer(v?: Konva.Layer): Konva.Layer {
    return layer('physical', v);
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
    private debugActions = true;
    private _currentInteraction: Interaction | null = null;
    private history: Mutation[] = [];
    private forwardHistory: Mutation[] = [];
    private loading = false;
    private stateHistory: StageState[] = [];
    private persistTimeout: number | undefined;
    private visibleComponents = new Set<Component>();
    private willRedraw = false;
    constructor() {
        this.stateHistory.push(this.componentsState());
    }
    currentInteraction(a?: Interaction | null): Interaction | null {  // TODO: move outside of workspace?
        if (a !== undefined) {
            this._currentInteraction?.cancel();
            this._currentInteraction = a;
        }
        return this._currentInteraction;
    }
    cancelInteractions() {
        this.currentInteraction()?.cancel();
    }
    onMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
        e.evt.preventDefault(); // Disable scroll on middle button click. TODO: check button?
        if (this._currentInteraction != null) {
            this._currentInteraction = this._currentInteraction.mousedown(e);
            return;
        }
        // Left button.
        if (e.evt.button == 0) {
            console.log('start new selection');
            new SelectInteraction().mousedown(e);
            return;
        }
        // Right click: deselect all.
        if (e.evt.button == 2) {
            workspace.update(new UpdateSelectionMutation(selectionAddresses(), []));
            return;
        }
        // Middle button.
        if (e.evt.button == 1) {
            // TODO: convert scene dragging to interaction.
            this.draggingScene = true;
            this.draggingOrigin = Point.screenCursor();
            this.initialOffset = new Point(schemeLayer().offsetX(), schemeLayer().offsetY());
        }
    }
    onMouseUp(event: Konva.KonvaEventObject<MouseEvent>) {
        if (this._currentInteraction != null) {
            this._currentInteraction = this._currentInteraction.mouseup(event);
            return;
        }
        this.draggingScene = false;
    }
    onMouseWheel(e: Konva.KonvaEventObject<WheelEvent>) {
        // TODO: add mousewheel as interaction method.
        let d = (e.evt.deltaY < 0) ? (1 / 1.1) : 1.1;
        let x = schemeLayer().scaleX();
        if (!x) return;
        let c = Point.cursor();
        x *= d;
        schemeLayer().scaleX(x);
        schemeLayer().scaleY(x);
        schemeLayer().offset(c.sub(Point.cursor()).add(new Point(schemeLayer().offset())));
        this.invalidateScene();
        workspace.delayedPersistInLocalHistory();
    }
    onMouseMove(event: Konva.KonvaEventObject<MouseEvent>) {
        if (this._currentInteraction != null) {
            this._currentInteraction = this._currentInteraction.mousemove(event);
            return;
        }
        if (this.draggingScene) {
            const sx = schemeLayer().scaleX();
            if (!sx) return true;
            let p = Point.screenCursor().sub(this.draggingOrigin).s(-1 / sx).add(this.initialOffset);
            schemeLayer().offset(p);
            this.invalidateScene();
            workspace.delayedPersistInLocalHistory();
        }
    }
    update(a: Mutation, keepForwardHistory: boolean = false) {
        this.history.push(a);
        if (!keepForwardHistory) this.forwardHistory = [];
        if (this.debugActions) {
            console.groupCollapsed(`applying ${a.constructor.name}`);
            console.log('action', a);
            let endGroup = true;
            a.apply();
            let sa = this.stateHistory[this.stateHistory.length - 1];
            let sb = this.componentsState();
            this.stateHistory.push(sb);
            a.undo();
            let s = this.componentsState();
            if (JSON.stringify(sa) != JSON.stringify(s)) {
                if (endGroup) { console.groupEnd(); endGroup = false; }
                error('undo changes state');
                console.group('details');
                console.log(diffString(sa, s));
                console.log('expected state', sa);
                console.log('actual state', s);
                console.groupEnd();
            }
            a.apply();
            s = this.componentsState();
            if (JSON.stringify(sb) != JSON.stringify(s)) {
                if (endGroup) { console.groupEnd(); endGroup = false; }
                error('redo changes state');
                console.group('details');
                console.log('diff', diffString(sb, s));
                console.log('expected state', sb);
                console.log('actual state', s);
                console.groupEnd();
            }
            console.log('new state', this.componentsState());
            if (endGroup) { console.groupEnd(); endGroup = false; }
        } else {
            a.apply();
        }
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
            console.log('new state', this.componentsState());
            console.groupEnd();
        } else {
            console.log(`undo action ${a.constructor.name}`)
            a.undo();
        }
        this.forwardHistory.push(a);
    }
    redo() {
        this.currentInteraction(null);
        const x = this.forwardHistory.pop();
        if (x != undefined) this.update(x, true);
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
                c.show(schemeLayer());
                c.materialized(true);
            });
            selectionAddresses(s.selection);
            console.log(this.componentsState(), schemeLayer());
        }
        this.stateHistory.push(this.componentsState());
        if (ws.history != undefined) {
            const h = ws.history.map(d => deserializeMutation(d));
            if (this.debugActions) {
                console.groupCollapsed('load actions');
                h.forEach(a => this.update(a, true));
                console.groupEnd();
            } else {
                this.history = h;
            }
        }
        // TODO: make currentLayer() assert instead of returning null.
        if (ws.view != undefined) {
            schemeLayer().offset(ws.view.offset);
            schemeLayer().scaleX(ws.view.scale);
            schemeLayer().scaleY(ws.view.scale);
        }
        this.invalidateScene();
    }
    componentsState(): StageState {
        let z: StageState = {
            roots: Array.from(roots.values())
                .sort((a, b) => a.id() - b.id())
                .map(c => c.serialize()),
            selection: selectionAddresses(),
        }
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
            scale: schemeLayer().scaleX()!,
            offset: schemeLayer().offset()!,
        }
    }
    private clearComponents() {
        roots.forEach(c => c.remove());
        resetIdCounter();
    }
    redraw() {
        this.willRedraw = false;
        this.visibleComponents.forEach(c => {
            if (c.dirtyLayout()) c.updateLayout();
        });
        schemeStage().batchDraw();
    }
    invalidateScene() {
        // console.log('redraw');
        if (this.willRedraw) return;
        this.willRedraw = true;
        const o = this;
        window.setTimeout(() => { o.redraw(); }, 0);
    }
    addVisibleComponent(c: Component) {
        this.visibleComponents.add(c);
        this.invalidateScene();
    }
    removeVisibleComponent(c: Component) {
        this.visibleComponents.delete(c);
        this.invalidateScene();
    }
}

export let workspace = new Workspace();