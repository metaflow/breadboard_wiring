import { Mutation, Interaction, mutationDeserializers } from "../mutation";
import { KonvaEventObject } from "konva/types/Node";
import { Component, ComponentSpec, deserializeComponent } from "../components/component";
import { currentLayer, Point, workspace } from "../workspace";
import theme from '../../theme.json';
import { assert } from "../utils";
import { plainToClass } from "class-transformer";
import { CompoundMutation } from "./compound";

export class AddComponentMutation extends Mutation {
    spec: ComponentSpec | undefined;
    constructor(spec: ComponentSpec) {
        super();
        console.log('add component', spec);
        this.spec = spec;
        this.postInit();
    }
    postInit() {
        if (this.spec == null) return;  // For deserialization.
        assert(this.spec.id != null);
    }
    apply(): void {
        const c = deserializeComponent(this.spec);
        console.log('apply add', c, this.spec);
        c.show(currentLayer());
        c.materialized(true);
    }
    undo(): void {
        if (this.spec == null) return;  // TODO: why?
        assert(this.spec.id != null);
        const c = Component.byID(this.spec.id!);
        c.materialized(false);
        c.hide();
    }
}

mutationDeserializers.set(AddComponentMutation.name, (d: object) => {
    return plainToClass(AddComponentMutation, d);
});

export class AddComponentInteraction extends Interaction {
    components: Component[];
    offsets: Point[];
    start: Point;
    constructor(cc: Component[]) {
        super();
        console.log('add compoenents', cc)
        this.components = cc;        
        this.components.forEach(c => {
            c.mainColor(theme.active);
            c.show(currentLayer());
        });
        this.offsets = this.components.map(c => c.offset());
        this.start = Point.cursor();
    }
    cancel() {
        this.components.forEach(c => c.remove());
    }
    mousemove(event: KonvaEventObject<MouseEvent>): Interaction | null {
        const o = this;
        this.components.forEach((c, i) => {
            c.offset(o.offsets[i].clone().add(Point.cursor()).sub(o.start).alignToGrid());
        });
        return this;
    }
    mousedown(event: KonvaEventObject<MouseEvent>): Interaction | null {
        const mm = this.components.map(c => new AddComponentMutation(c.serialize()));
        this.cancel();        
        workspace.update(new CompoundMutation(mm));
        return null;
    }
}