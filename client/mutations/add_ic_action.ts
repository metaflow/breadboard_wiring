import { Mutation, actionDeserializers, ActionState } from "../mutation";
import { KonvaEventObject } from "konva/types/Node";
import { Component, deserializeComponent } from "../components/component";
import { currentLayer, Point, PlainPoint } from "../workspace";
import theme from '../../theme.json';

const marker = 'PlaceComponentAction';

interface PlaceComponentActionSpec {
    typeMarker: 'PlaceComponentAction';
    component_spec: any;
}

export class PlaceComponentAction extends Mutation {
    xy: Point = new Point();
    component: Component;
    private constructor(state: ActionState, component: Component,) {
        super(state);
        this.component = component;        
    }
    static start(component: Component): PlaceComponentAction {
        const z = new PlaceComponentAction('active', component);
        z.component.mainColor(theme.active);
        z.component.show(currentLayer());
        return z;
    }
    finish() {
        super.finish();
        this.component.offset(this.xy);
        this.component.mainColor(theme.foreground);
    }
    static deserialize(data: any, state: ActionState): Mutation|null {
        if (data['typeMarker'] !== marker) return null;
        const s: PlaceComponentActionSpec = data;
        let z = new PlaceComponentAction(state, deserializeComponent(s.component_spec));
        return z;
    }
    apply(): void {
        super.apply();
        this.component.show(currentLayer());
        this.component.materialized(true);
    }
    undo(): void {
        super.undo();
        this.component.materialized(false);
        this.component.hide();
    }
    cancel(): void {
        super.cancel();
        this.component.materialized(false);
        this.component.hide();
    }
    mousemove(event: KonvaEventObject<MouseEvent>): boolean {        
        this.xy = Point.cursor().alignToGrid();
        this.component.offset(this.xy);
        return false;
    }
    mousedown(event: KonvaEventObject<MouseEvent>): boolean {
        return true;
    }
    mouseup(event: KonvaEventObject<MouseEvent>): boolean {
        return false;
    }
    serialize(): any {
        const z: PlaceComponentActionSpec = {
            typeMarker: marker,
            component_spec: this.component.serialize(),
            offset: this.xy.plain(),
        };
        return z;
    }
}

actionDeserializers.push(PlaceComponentAction.deserialize);