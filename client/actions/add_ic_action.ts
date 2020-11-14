import { Action, actionDeserializers } from "../action";
import { KonvaEventObject } from "konva/types/Node";
import { Component, deserializeComponent } from "../components/component";
import { actionLayer, defaultLayer, PhysicalPoint, PlainPoint } from "../stage";

const marker = 'PlaceComponentAction';

interface PlaceComponentActionSpec {
    typeMarker: 'PlaceComponentAction';
    component_spec: any;
    offset: PlainPoint;
}

actionDeserializers.push(function(data: any): Action|null {
    if (data['typeMarker'] !== marker) return null;
    const s: PlaceComponentActionSpec = data;
    let c = deserializeComponent(s.component_spec);
    if (c == null) return null;
    let z = new PlaceComponentAction(c);
    z.xy = new PhysicalPoint(s.offset);
    return z;
});

export class PlaceComponentAction implements Action {
    xy: PhysicalPoint = new PhysicalPoint();
    component: Component;
    constructor(component: Component) {
        this.component = component;
        this.component.mainColor('red');
        this.component.updateLayout();
        this.component.show(actionLayer());
    }
    apply(): void {
        this.component.offset(this.xy);
        this.component.mainColor('black');
        this.component.updateLayout();
        this.component.show(defaultLayer());
        this.component.materialized(true);
    }
    undo(): void {
        this.component.materialized(false);
        this.component.hide();
    }
    mousemove(event: KonvaEventObject<MouseEvent>): boolean {        
        this.xy = PhysicalPoint.cursor().alignToGrid();
        this.component.offset(this.xy);
        this.component.updateLayout();
        return false;
    }
    mousedown(event: KonvaEventObject<MouseEvent>): boolean {
        return true;
    }
    mouseup(event: KonvaEventObject<MouseEvent>): boolean {
        return false;
    }
    cancel(): void {
        this.undo();
    }
    serialize(): any {
        const z: PlaceComponentActionSpec = {
            typeMarker: marker,
            component_spec: this.component.spec(),
            offset: this.xy.plain(),
        };
        return z;
    }
}