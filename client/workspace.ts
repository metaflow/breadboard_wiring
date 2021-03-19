import Konva from 'konva';
import { Contact } from './components/contact';
import { all, Component, deserializeComponent, resetIdCounter, roots } from './components/component';
import { selectionAddresses } from './components/selectable_component';
import { assert, error } from './utils';
import { Mutation, Interaction, deserializeMutation } from './mutation';
import { diffString } from 'json-diff';
import { SelectInteraction, UpdateSelectionMutation } from './actions/select';
import {Union, Literal, Static} from 'runtypes';

export class PlainPoint {
    x: number = 0;
    y: number = 0;
};

export const SCHEME = 'scheme';
export const PHYSICAL = 'physical';

export const AreaNameT = Union(
    Literal(SCHEME),
    Literal(PHYSICAL),
);
export type AreaName = Static<typeof AreaNameT>;
export const LayerNameT = Union(
    Literal('scheme:default'),
    Literal('physical:default'),
);
export type LayerName = Static<typeof LayerNameT>;
export const allStages: AreaName[] = [SCHEME, PHYSICAL];

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
    array(): [number, number] {
        return [this.x, this.y];
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
};

let layers = new Map<string, Konva.Layer>();
export function layer(name: LayerName, v?: Konva.Layer): Konva.Layer {
    if (v !== undefined) {
        layers.set(name, v);
        return v;
    }
    const x = layers.get(name);
    if (x) return x;
    throw error(`no layer ${name}`);
}

export function stageLayer(stageName: AreaName): LayerName {
    assert(stageName.indexOf(":") < 0, `stage name ${stageName} is invalid`);
    return LayerNameT.check(stageName + ":default");
}

export function layerStage(layerName: LayerName): AreaName {
    const parts = layerName.split(":");
    assert(parts.length == 2, `layer name ${layerName} is invalid`);
    return AreaNameT.check(parts[0]);
}

export interface AreaState {
    roots: any[] | undefined;
    selection: string[] | undefined;
}

interface WorkspaceState {
    components: AreaState | undefined;
    history: any[] | undefined;
    layers: [string, any][] | undefined;
}

interface ViewState {
    scale: number;
    offset: PlainPoint;
}

export class Area {
    readonly stage: Konva.Stage;
    readonly name: AreaName
    private draggingScene = false;
    private draggingOrigin = new Point();
    private initialOffset = new Point();
    private _gridAlignment: number|null = null;

    constructor(name: AreaName, _stage: Konva.Stage) {
        this.name = name;
        this.stage = _stage;
    }
    setupEvents() {
        const o = this;
        this.stage.on('mousemove', function (e: Konva.KonvaEventObject<MouseEvent>) {
            o.onMouseMove(e);
        });
        this.stage.on('wheel', function (e: Konva.KonvaEventObject<WheelEvent>) {
            o.onMouseWheel(e);
        });
        this.stage.on('mousedown', function (e: Konva.KonvaEventObject<MouseEvent>) {
            o.onMouseDown(e);
        });
        this.stage.on('mouseup', function (e: Konva.KonvaEventObject<MouseEvent>) {
            o.onMouseUp(e);
        });
    }
    onMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {        
        e.evt.preventDefault(); // Disable scroll on middle button click. TODO: check button?
        const t = workspace.currentInteraction();
        if (t != null) {
            if (t.areaName !== this.name) {
                console.log('action on different stage', t.areaName, this.name);
                return;
            }
            workspace.currentInteraction(t.mousedown(e));
            return;
        }
        // Left button.
        if (e.evt.button == 0) {
            console.log('start new selection');
            new SelectInteraction(this.name).mousedown(e);
            return;
        }
        // Right click: deselect all.
        if (e.evt.button == 2) {
            workspace.update(new UpdateSelectionMutation(selectionAddresses(), []));
            return;
        }
        // Middle button.
        if (e.evt.button == 1) {
            // TODO: convert scene dragging to interaction (?).
            this.draggingScene = true;
            this.draggingOrigin = this.screenCursor();
            const lr = this.layer();
            this.initialOffset = new Point(lr.offsetX(), lr.offsetY());
        }
    }
    onMouseUp(event: Konva.KonvaEventObject<MouseEvent>) {
        const t = workspace.currentInteraction();
        if (t != null) {
            if (t.areaName !== this.name) {
                console.log('action on different stage', t.areaName, this.name);
                return;
            }
            workspace.currentInteraction(t.mouseup(event));
            return;
        }
        this.draggingScene = false;
    }
    onMouseWheel(e: Konva.KonvaEventObject<WheelEvent>) {
        let d = (e.evt.deltaY < 0) ? (1 / 1.1) : 1.1;
        const lr = this.layer();
        let x = lr.scaleX();
        if (!x) return;
        let c = this.cursor();
        x *= d;
        lr.scaleX(x);
        lr.scaleY(x);
        lr.offset(c.sub(this.cursor()).add(new Point(lr.offset())));
        workspace.invalidateScene();
        workspace.delayedPersistInLocalHistory();
    }
    onMouseMove(event: Konva.KonvaEventObject<MouseEvent>) {
        const t = workspace.currentInteraction();
        if (t != null) {
            if (t.areaName !== this.name) {
                console.log('action on different stage', t.areaName, this.name);
                return;
            }
            workspace.currentInteraction(t.mousemove(event));
            return;
        }
        if (this.draggingScene) {
            const lr = this.layer();
            const sx = lr.scaleX();
            if (!sx) return true;
            let p = this.screenCursor().sub(this.draggingOrigin).s(-1 / sx).add(this.initialOffset);
            lr.offset(p);
            workspace.invalidateScene();
            workspace.delayedPersistInLocalHistory();
        }
    }
    screenCursor(): Point {
        let pos = this.stage.getPointerPosition();
        if (pos == null) pos = { x: 0, y: 0 };
        return new Point(pos);
    }
    cursor(): Point {
        let pos = this.stage.getPointerPosition();
        if (pos == null) pos = { x: 0, y: 0 };
        return new Point(this.layer().getTransform().copy().invert().point(pos));
    }
    alignedCursor(): Point {
        return this.align(this.cursor());
    }
    align(p : Point): Point {
        return p.clone().align(this.gridAlignment());
    }
    gridAlignment(v?: number | null): number | null {
        if (v !== undefined) this._gridAlignment = v;
        return this._gridAlignment;
    }
    layer(): Konva.Layer {
        return layer(stageLayer(this.name));
    }
    closesetContact(xy?: Point): Contact | null {
        if (xy === undefined) xy = this.cursor();
        let z: Contact | null = null;
        let dz = 0;
        // TODO: not all contacts, nonly ones of this area.
        all(Contact).forEach((c: Contact) => {             
            const d = c.absolutePosition().distance(xy!);
            if (z == null || d < dz) {
                z = c;
                dz = d;
            }
        });
        return z;
    }
}


export class Workspace {
    private debugActions = true;
    private _currentInteraction: Interaction | null = null;
    private history: Mutation[] = [];
    private forwardHistory: Mutation[] = [];
    private loading = false;
    private stateHistory: AreaState[] = [];
    private persistTimeout: number | undefined;
    private visibleComponents = new Set<Component>();
    private willRedraw = false;
    private areas = new Map<AreaName, Area>();
    constructor() {
        this.stateHistory.push(this.componentsState());        
    }
    addArea(name: AreaName, v: Konva.Stage) {
        assert(!this.areas.has(name), `${name} area already set`);
        this.areas.set(name, new Area(name, v));        
    }
    area(name: AreaName): Area {
        const x = this.areas.get(name);
        if (x) return x;
        throw error(`${name} area is not set`);
    }
    currentInteraction(a?: Interaction | null): Interaction | null {
        if (a !== undefined) {
            this._currentInteraction?.cancel();
            this._currentInteraction = a;
        }
        return this._currentInteraction;
    }
    cancelInteractions() {
        this.currentInteraction()?.cancel();
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
        const x = this.serialize();
        console.log(x);
        localStorage.setItem('actions_history', JSON.stringify(x));
    }
    delayedPersistInLocalHistory() {
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
    clear() {
        this.history = [];
        this.forwardHistory = [];
        this.stateHistory = [];
        this.clearComponents();
    }
    deserialize(s: any) {
        this.clear()
        document.title = 'scheme';
        const ws = s as WorkspaceState;
        if (ws.components !== undefined && ws.components.roots != null && (ws.history === undefined || !this.debugActions)) {
            ws.components.roots.forEach((a: any) => {
                const c = deserializeComponent(a);
                c.show();
                c.materialized(true);
            });
            selectionAddresses(s.selection);
            console.log(this.componentsState());
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
        if (ws.layers != undefined) {
            ws.layers.forEach((v: [string, ViewState]) => {
                const [name, state] = v;
                const lr = layer(LayerNameT.check(name));                
                lr.offset(state.offset);
                lr.scaleX(state.scale);
                lr.scaleY(state.scale);
            });            
        }
        this.invalidateScene();
    }
    componentsState(): AreaState {
        let z: AreaState = {
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
            layers: allStages.map(x => {
                return [stageLayer(x), this.serializeLayerState(stageLayer(x))];
            }),
        };
    }
    private serializeLayerState(layerName: LayerName): ViewState {
        const lr = layer(layerName);
        return {
            scale: lr.scaleX()!,
            offset: lr.offset()!,
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
        this.areas.forEach(a => a.stage.batchDraw());
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
    setupEvents() {
        this.areas.forEach(a => a.setupEvents());
            
    }
}

export let workspace = new Workspace();