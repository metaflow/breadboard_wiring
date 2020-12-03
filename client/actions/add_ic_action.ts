import { Mutation, actionDeserializers as mutationDeserializers, Interaction, MutationSpec } from "../mutation";
import { KonvaEventObject } from "konva/types/Node";
import { Component, deserializeComponent } from "../components/component";
import { currentLayer, Point, PlainPoint, workspace } from "../workspace";
import theme from '../../theme.json';

const marker = 'PlaceComponentAction';

interface PlaceComponentActionSpec extends MutationSpec {
    component_spec: any;
}

mutationDeserializers.set(marker, (d: PlaceComponentActionSpec) => {
    return new AddComponentMutation(deserializeComponent(d.component_spec));
});

export class AddComponentInteraction extends Interaction {
    component: Component;
    constructor(c: Component) {
        super();
        this.component = c;
        this.component.mainColor(theme.active);
        this.component.show(currentLayer());
    }
    cancel() {
        this.component.hide();
    }
    mousemove(event: KonvaEventObject<MouseEvent>): Interaction | null {
        this.component.offset(Point.cursor().alignToGrid());
        this.component.updateLayout();
        workspace.invalidateScene();
        return this;
    }
    mousedown(event: KonvaEventObject<MouseEvent>): Interaction | null {
        this.component.mainColor(theme.foreground);
        workspace.update(new AddComponentMutation(this.component));
        return null;
    }
}

export class AddComponentMutation extends Mutation {
    component: Component;
    xy: Point = new Point();
    constructor(component: Component) {
        super();
        this.component = component;
    }
    apply(): void {
        this.component.show(currentLayer());
        this.component.materialized(true);
    }
    undo(): void {
        this.component.materialized(false);
        this.component.hide();
    }
    serialize(): any {
        const z: PlaceComponentActionSpec = {
            T: marker,
            component_spec: this.component.serialize(),
        };
        return z;
    }
}