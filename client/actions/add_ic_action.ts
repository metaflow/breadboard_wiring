import { Mutation, Interaction, mutationDeserializers } from "../mutation";
import { KonvaEventObject } from "konva/types/Node";
import { Component, ComponentSpec, deserializeComponent } from "../components/component";
import { currentLayer, Point, workspace } from "../workspace";
import theme from '../../theme.json';
import { getTypedByAddress, newAddress } from "../address";
import { assert } from "../utils";
import assertExists from "ts-assert-exists";
import { plainToClass } from "class-transformer";

export class AddComponentMutation extends Mutation {
    spec: ComponentSpec|undefined;
    constructor(spec: ComponentSpec) {
        super();        
        this.spec = spec;
        this.postInit();
    }
    postInit() {
        if (this.spec == null) return;
        assert(this.spec.id != null);
    }
    apply(): void {
        const c = deserializeComponent(this.spec);
        c.show(currentLayer());
        c.materialized(true);
    }
    undo(): void {
        if (this.spec == null) return;
        const c = assertExists(getTypedByAddress(Component, this.spec.id!));
        c.materialized(false);
        c.hide();
    }
}

mutationDeserializers.set(AddComponentMutation.name, (d: object) => {
    return plainToClass(AddComponentMutation, d);
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
        const s = this.component.serialize();
        s.id = newAddress();
        workspace.update(new AddComponentMutation(s));
        return null;
    }
}